/**
 * Color Lithophane Engine — CMYW Channel Generation
 *
 * Converts an RGB image into 4 separate greyscale images (Cyan, Magenta, Yellow,
 * White) and generates 4 independent lithophane meshes.
 *
 * Key insight: K (black) is NOT a separate physical channel. Instead, the White
 * layer's thickness controls luminosity:
 *   - Thick white → blocks light → appears dark/black
 *   - Thin  white → transmits light → appears bright
 *
 * C/M/Y are thin color filter layers printed on top of the white base, each
 * limited to `colorThickness` mm (default 0.6mm).
 *
 * Algorithm reference: lithophanemaker.com "Chromaphane" / CMYW palette approach.
 */

import {
  MeshEngineResult,
  ProgressCallback,
  LithoParams,
  WasmLithoModule,
  ColorMeshSet,
  CMYWChannel,
  COLOR_CHANNELS,
} from './types';

/** Per-pixel CMYW decomposition result (values 0–1) */
interface CMYWPixel {
  c: number;
  m: number;
  y: number;
  k: number; // intermediate — used only to compute white thickness, NOT a separate layer
}

/**
 * Convert a single RGB pixel to CMYW using standard UCR (Under Color Removal).
 *
 * K = min(C', M', Y')  — the achromatic component
 * C, M, Y = (X - K) / (1 - K) — pure color components after K removal
 * White thickness ∝ K (high K → thick white → dark pixel)
 */
export function rgbToCmyw(r: number, g: number, b: number): CMYWPixel {
  // Normalize to 0–1
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  // CMY from inverse RGB
  let c = 1 - rn;
  let m = 1 - gn;
  let y = 1 - bn;

  // Key (black) is the minimum of CMY — used for white thickness calculation
  const k = Math.min(c, m, y);

  // Remove the K component from CMY to get pure color amounts
  if (k < 1) {
    const inv = 1 / (1 - k);
    c = (c - k) * inv;
    m = (m - k) * inv;
    y = (y - k) * inv;
  } else {
    // Pure black pixel — no color, all darkness comes from white thickness
    c = 0;
    m = 0;
    y = 0;
  }

  return { c, m, y, k };
}

/**
 * Extract a single channel from the full image, producing a greyscale ImageData.
 *
 * For **White** (controls luminosity via thickness):
 *   K=0 (bright pixel) → grey=255 (thin white, light passes)
 *   K=1 (dark  pixel) → grey=0   (thick white, blocks light)
 *
 * For **C/M/Y** (color filter layers):
 *   Channel=0 (no color) → grey=255 (thin, no material)
 *   Channel=1 (full color) → grey=0  (max filter thickness)
 *
 * The WASM engine interprets darker pixels = thicker mesh.
 */
function extractChannelImage(
  sourceData: Uint8ClampedArray,
  width: number,
  height: number,
  channel: CMYWChannel
): ImageData {
  const out = new ImageData(width, height);
  const data = out.data;

  for (let i = 0; i < sourceData.length; i += 4) {
    const r = sourceData[i];
    const g = sourceData[i + 1];
    const b = sourceData[i + 2];

    const cmyw = rgbToCmyw(r, g, b);

    let value: number;
    switch (channel) {
      case 'cyan':    value = cmyw.c; break;
      case 'magenta': value = cmyw.m; break;
      case 'yellow':  value = cmyw.y; break;
      case 'white':
        // White channel: K controls thickness.
        // K=1 → value=1 → grey=0 (dark=thick white=blocks light=black)
        // K=0 → value=0 → grey=255 (thin white=light passes=bright)
        value = cmyw.k;
        break;
    }

    // Invert: value 1 → pixel 0 (dark = thick), value 0 → pixel 255 (light = thin)
    const grey = Math.round((1 - value) * 255);

    data[i]     = grey;
    data[i + 1] = grey;
    data[i + 2] = grey;
    data[i + 3] = 255;
  }

  return out;
}

/** Human-readable channel names for progress reporting */
const CHANNEL_LABELS: Record<CMYWChannel, string> = {
  cyan:    'Cyan (C)',
  magenta: 'Magenta (M)',
  yellow:  'Yellow (Y)',
  white:   'White (W)',
};

/**
 * Generate a full CMYW color lithophane set.
 *
 * Produces 4 independent meshes, one per channel, by:
 * 1. Decomposing the source image into 4 greyscale channel images
 * 2. Calling the WASM lithophane engine for each channel
 *
 * **White layer** uses the full baseThickness–maxThickness range (~0.6–2.8mm)
 * to control luminosity.
 *
 * **C/M/Y layers** are limited to colorThickness (default 0.6mm) as they act
 * only as color filters — too thick and they block all light.
 */
export function generateColorLitho(
  imageData: ImageData,
  width: number,
  height: number,
  params: LithoParams,
  postProgress: ProgressCallback,
  wasmModule: WasmLithoModule
): ColorMeshSet {
  const results: Partial<Record<CMYWChannel, MeshEngineResult>> = {};
  const colorThickness = params.colorLithoParams?.colorThickness ?? 0.6;

  // For each channel, extract greyscale image and generate mesh
  for (let i = 0; i < COLOR_CHANNELS.length; i++) {
    const channel = COLOR_CHANNELS[i];
    const baseProgress = (i / COLOR_CHANNELS.length) * 100;
    const channelWeight = 100 / COLOR_CHANNELS.length; // 25% per channel

    postProgress(
      Math.round(baseProgress),
      `Generating ${CHANNEL_LABELS[channel]} layer...`
    );

    // Step 1: Extract channel greyscale image
    const channelImage = extractChannelImage(imageData.data, width, height, channel);

    // Step 2: Build params for this channel
    const isColorLayer = channel !== 'white';
    const channelParams: LithoParams = {
      ...params,
      invert: false, // channel extraction already handles polarity
      contrast: 1.0,
      brightness: 0.0,
      sharpness: 0.0,
    };

    if (isColorLayer) {
      // C/M/Y: limit thickness to colorThickness (thin filter layers)
      // Base = near-zero (no material where channel value is 0)
      channelParams.baseThickness = 0.0;
      channelParams.maxThickness = colorThickness;

      // Apply coarser resolution for color layers if configured
      if (params.colorLithoParams) {
        const ratio = params.colorLithoParams.coloredResolution / 0.5; // 0.5mm baseline
        if (ratio > 1) {
          channelParams.resolution = Math.max(
            Math.floor(params.resolution / ratio),
            50 // minimum mesh points per side
          );
        }
      }
    }
    // White channel: uses the full baseThickness/maxThickness from params (no override)

    // Step 3: Generate mesh via WASM
    const channelProgress: ProgressCallback = (p, msg) => {
      postProgress(
        Math.round(baseProgress + (p / 100) * channelWeight),
        `${CHANNEL_LABELS[channel]}: ${msg}`
      );
    };

    const result = wasmModule.generate_lithophane(
      channelImage.data,
      width,
      height,
      channelParams,
      channelProgress
    );

    results[channel] = {
      positions: result.positions,
      indices: result.indices,
      normals: result.normals,
      uvs: result.uvs,
      stats: result.stats,
    };
  }

  postProgress(100, 'All CMYW channels generated');

  return results as ColorMeshSet;
}
