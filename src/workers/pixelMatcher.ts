/**
 * Pixel Matcher — Map image pixels to achievable filament combinations
 *
 * For each pixel in the input image, finds the closest achievable colour
 * in the pre-computed palette using CIEDE2000 perceptual distance.
 *
 * Performance targets:
 *   - 1000×1000 image ≈ 1M pixels → completes in <2s (typical palette ~200 colors)
 *   - Uses pre-computed Lab values to avoid repeated conversions
 */

import { type RGB, type Lab, rgbToLab, deltaE2000 } from '../utils/colorScience';
import { type AchievableColor } from '../models/filamentPalette';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of matching a single pixel */
export interface PixelMatch {
  /** Index into the achievable palette */
  paletteIndex: number;
  /** CIEDE2000 distance (error) */
  deltaE: number;
}

/** Result of matching an entire image */
export interface ImageMatchResult {
  /** Match result for each pixel (row-major order) */
  matches: Uint16Array;
  /** Delta E error for each pixel */
  errors: Float32Array;
  /** Width of the image */
  width: number;
  /** Height of the image */
  height: number;
  /** Statistics */
  stats: MatchStats;
}

export interface MatchStats {
  /** Average ΔE across all pixels */
  avgDeltaE: number;
  /** Maximum ΔE (worst match) */
  maxDeltaE: number;
  /** Percentage of pixels with ΔE < 5 (good match) */
  goodMatchPercent: number;
  /** Number of unique palette entries used */
  usedColors: number;
  /** Processing time in ms */
  processingTimeMs: number;
}

// ─── Single Pixel Match ─────────────────────────────────────────────────────

/**
 * Find the closest achievable colour for a single pixel.
 * Uses CIEDE2000 for perceptually accurate matching.
 *
 * @param pixelLab  CIELab colour of the pixel
 * @param palette   Pre-computed achievable palette with Lab values
 * @returns         Index and distance of the best match
 */
export function matchPixel(
  pixelLab: Lab,
  palette: AchievableColor[],
): PixelMatch {
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const dist = deltaE2000(pixelLab, palette[i].predictedLab);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
      // Early exit for perfect/near-perfect matches
      if (dist < 0.5) break;
    }
  }

  return { paletteIndex: bestIndex, deltaE: bestDist };
}

// ─── Full Image Matching ─────────────────────────────────────────────────────

/**
 * Match all pixels of an image to the achievable palette.
 *
 * @param imageData  Raw RGBA pixel data (like from canvas.getImageData)
 * @param width      Image width
 * @param height     Image height
 * @param palette    Pre-computed achievable palette
 * @param onProgress Optional progress callback (0-1)
 * @returns          Complete match result with stats
 */
export function matchImage(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  palette: AchievableColor[],
  onProgress?: (progress: number) => void,
): ImageMatchResult {
  const startTime = performance.now();
  const totalPixels = width * height;

  // Allocate result arrays
  // Uint16 supports palettes up to 65535 entries (more than enough)
  const matches = new Uint16Array(totalPixels);
  const errors = new Float32Array(totalPixels);

  // Build a Lab cache from the image to avoid redundant conversions.
  // Many images have repeated colours (background, flat areas).
  const labCache = new Map<number, Lab>();
  const usedSet = new Set<number>();

  let totalDeltaE = 0;
  let maxDeltaE = 0;
  let goodCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = imageData[offset];
    const g = imageData[offset + 1];
    const b = imageData[offset + 2];

    // Pack RGB into a single number for cache key
    const key = (r << 16) | (g << 8) | b;

    let lab = labCache.get(key);
    if (!lab) {
      lab = rgbToLab(r, g, b);
      labCache.set(key, lab);
    }

    const match = matchPixel(lab, palette);
    matches[i] = match.paletteIndex;
    errors[i] = match.deltaE;
    usedSet.add(match.paletteIndex);

    totalDeltaE += match.deltaE;
    if (match.deltaE > maxDeltaE) maxDeltaE = match.deltaE;
    if (match.deltaE < 5) goodCount++;

    // Report progress every 10000 pixels
    if (onProgress && i % 10000 === 0) {
      onProgress(i / totalPixels);
    }
  }

  if (onProgress) onProgress(1);

  const processingTimeMs = performance.now() - startTime;

  return {
    matches,
    errors,
    width,
    height,
    stats: {
      avgDeltaE: totalPixels > 0 ? totalDeltaE / totalPixels : 0,
      maxDeltaE,
      goodMatchPercent: totalPixels > 0 ? (goodCount / totalPixels) * 100 : 0,
      usedColors: usedSet.size,
      processingTimeMs,
    },
  };
}

/**
 * Generate a preview image from match results.
 * Replaces each pixel with its matched palette colour.
 *
 * @param matchResult  Output of matchImage()
 * @param palette      The palette used for matching
 * @returns            RGBA Uint8ClampedArray for rendering
 */
export function renderMatchPreview(
  matchResult: ImageMatchResult,
  palette: AchievableColor[],
): Uint8ClampedArray {
  const { matches, width, height } = matchResult;
  const totalPixels = width * height;
  const output = new Uint8ClampedArray(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const color = palette[matches[i]].predictedRgb;
    const offset = i * 4;
    output[offset] = color[0];
    output[offset + 1] = color[1];
    output[offset + 2] = color[2];
    output[offset + 3] = 255; // fully opaque
  }

  return output;
}

/**
 * Generate an error heatmap visualisation.
 * Green = good match (ΔE < 3), Yellow = ok (3-10), Red = poor (>10)
 *
 * @param matchResult  Output of matchImage()
 * @returns            RGBA Uint8ClampedArray for rendering
 */
export function renderErrorHeatmap(
  matchResult: ImageMatchResult,
): Uint8ClampedArray {
  const { errors, width, height } = matchResult;
  const totalPixels = width * height;
  const output = new Uint8ClampedArray(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const de = errors[i];
    const offset = i * 4;

    if (de < 3) {
      // Green: perfect match
      output[offset] = 0;
      output[offset + 1] = Math.round(200 - de * 30);
      output[offset + 2] = 0;
    } else if (de < 10) {
      // Yellow to Orange: acceptable
      const t = (de - 3) / 7;
      output[offset] = Math.round(255 * t + 200 * (1 - t));
      output[offset + 1] = Math.round(200 * (1 - t));
      output[offset + 2] = 0;
    } else {
      // Red: poor match
      output[offset] = 255;
      output[offset + 1] = 0;
      output[offset + 2] = 0;
    }
    output[offset + 3] = 255;
  }

  return output;
}
