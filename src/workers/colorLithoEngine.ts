/**
 * Color Lithophane Engine — CMYW Channel Generation + Palette Mode
 *
 * Converts an RGB image into either:
 * 1. 5 separate greyscale images (White base, Yellow, Magenta, Cyan, White top)
 *    and generates 5 independent lithophane meshes (CMYW mode).
 * 2. N separate per-filament thickness maps using calibrated Beer-Lambert
 *    colour combinations (Palette mode).
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
  PaletteMeshSet,
  PaletteMeshEntry,
} from './types';

// Palette-mode colour science now runs entirely in WASM (build_palette_maps).
// Only PrintConfig type is needed for the TS orchestration layer.
import type { PrintConfig } from '../models/filamentPalette';

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
      case 'white_top':
        // White top diffuser: constant thin layer across entire surface.
        // value=0.5 → grey=128 → uniform half-thickness diffuser
        value = 0.5;
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
  white:     'White Base (W)',
  yellow:    'Yellow (Y)',
  magenta:   'Magenta (M)',
  cyan:      'Cyan (C)',
  white_top: 'White Top (T)',
};

/**
 * Generate a full CMYW color lithophane set.
 *
 * Produces 5 independent meshes, one per channel, by:
 * 1. Decomposing the source image into 5 greyscale channel images
 * 2. Calling the WASM lithophane engine for each channel
 *
 * **White base layer** uses the full baseThickness–maxThickness range (~0.6–2.8mm)
 * to control luminosity.
 *
 * **C/M/Y layers** are limited to colorThickness (default 0.6mm) as they act
 * only as color filters — too thick and they block all light.
 *
 * **White top layer** is a constant-thickness diffuser (~0.3–0.4mm) that
 * softens and smooths the light output.
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
    const isColorLayer = channel !== 'white' && channel !== 'white_top';
    const isWhiteTop = channel === 'white_top';
    const channelParams: LithoParams = {
      ...params,
      invert: false, // channel extraction already handles polarity
      // contrast, brightness, sharpness are inherited from params
      // so the user's image adjustments are respected
    };

    if (isWhiteTop) {
      // White top diffuser: constant thin layer (~0.3–0.4mm)
      channelParams.baseThickness = 0.3;
      channelParams.maxThickness = 0.4;
    } else if (isColorLayer) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Palette-Mode Lithophane Engine
// Colour science pipeline (palette build, CIEDE2000 matching, thickness extraction)
// runs entirely in WASM via build_palette_maps(). TS orchestrates mesh generation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a palette-mode color lithophane set.
 *
 * Unlike the fixed CMYW mode, this generates a variable number of meshes
 * (one per active filament) using calibrated colour combinations.
 *
 * Pipeline:
 * 1. Build achievable colour palette from PrintConfig
 * 2. Match every pixel to the closest achievable combo (CIEDE2000)
 * 3. For each filament, extract a greyscale thickness map
 * 4. Generate mesh via WASM for each filament
 *
 * @returns PaletteMeshSet with one entry per filament + match quality stats
 */
export async function generatePaletteLitho(
  imageData: ImageData,
  width: number,
  height: number,
  params: LithoParams,
  printConfig: PrintConfig,
  postProgress: ProgressCallback,
  wasmModule: WasmLithoModule
): Promise<PaletteMeshSet> {
  // ── Step 1–2: Build palette + match pixels + extract thickness maps in WASM ──
  // Entire heavy pipeline runs in Rust: palette build, CIEDE2000 matching,
  // per-filament greyscale extraction. ~10-50× faster than the JS path.
  const wasmPrintConfig = {
    slots: printConfig.slots.map(s => ({
      slot: s.slot,
      filament: {
        id: s.filament.id,
        name: s.filament.name,
        hexColor: s.filament.hexColor,
        td: s.filament.td,
      },
    })),
    maxLayers: printConfig.maxLayers,
    layerHeight: printConfig.layerHeight,
    baseFilament: {
      id: printConfig.baseFilament.id,
      name: printConfig.baseFilament.name,
      hexColor: printConfig.baseFilament.hexColor,
      td: printConfig.baseFilament.td,
    },
  };

  const paletteProgress: ProgressCallback = (p, msg) => {
    // Map WASM 0–100% to our 0–40% range
    postProgress(Math.round(p * 0.4), msg);
  };

  const paletteResult = wasmModule.build_palette_maps(
    imageData.data,
    width,
    height,
    wasmPrintConfig,
    paletteProgress
  );

  const { filament_maps, stats: matchStats } = paletteResult;

  postProgress(40, `Match complete: avg ΔE=${matchStats.avgDeltaE.toFixed(1)}, ${matchStats.goodMatchPercent.toFixed(0)}% good`);

  // ── Step 3: For each filament, generate mesh from the greyscale thickness map ──
  const entries: PaletteMeshEntry[] = [];
  const meshPhaseStart = 40;
  const meshPhaseWeight = 55; // 40–95% for mesh generation
  const perFilamentWeight = meshPhaseWeight / filament_maps.length;

  const layerHeight = params.colorLithoParams?.layerHeight ?? 0.1;

  for (let fi = 0; fi < filament_maps.length; fi++) {
    const fmap = filament_maps[fi];
    const baseProgress = meshPhaseStart + fi * perFilamentWeight;
    const isBase = fi === 0;

    postProgress(
      Math.round(baseProgress),
      `Generating ${fmap.name} mesh...`
    );

    // Build params for this filament layer
    // IMPORTANT: preserve user's contrast/brightness/sharpness settings!
    // These control WASM-side image processing (sharpening filter, histogram
    // adjustments) which improve mesh detail for ALL layer types.
    // The WASM build_palette_maps already handles colour science separately.
    const filamentParams: LithoParams = {
      ...params,
      invert: false,
      // contrast, brightness, sharpness are inherited from params
      // so the user's image adjustments are respected (matching CMYW behaviour)
    };

    if (!isBase) {
      filamentParams.baseThickness = 0.0;
      filamentParams.maxThickness = printConfig.maxLayers * layerHeight;
    }

    // Generate mesh via WASM from the greyscale thickness map
    const filamentProgress: ProgressCallback = (p, msg) => {
      postProgress(
        Math.round(baseProgress + (p / 100) * perFilamentWeight),
        `${fmap.name}: ${msg}`
      );
    };

    const result = wasmModule.generate_lithophane(
      fmap.greyscale,
      width,
      height,
      filamentParams,
      filamentProgress
    );

    entries.push({
      filamentId: fmap.id,
      filamentName: fmap.name,
      filamentHex: fmap.hex,
      mesh: {
        positions: result.positions,
        indices: result.indices,
        normals: result.normals,
        uvs: result.uvs,
        stats: result.stats,
      },
    });
  }

  postProgress(95, 'Finalising palette lithophane...');

  const paletteMeshSet: PaletteMeshSet = {
    entries,
    stats: {
      avgDeltaE: matchStats.avgDeltaE,
      maxDeltaE: matchStats.maxDeltaE,
      goodMatchPercent: matchStats.goodMatchPercent,
      usedColors: matchStats.usedColors,
    },
  };

  postProgress(100, `Palette lithophane complete (${entries.length} filaments, avg ΔE=${matchStats.avgDeltaE.toFixed(1)})`);

  return paletteMeshSet;
}

