/**
 * Color Lithophane Engine — CMYK+W Channel Generation
 *
 * Converts an RGB image into 5 separate greyscale images (Cyan, Magenta, Yellow,
 * Key/Black, White) and generates 5 independent lithophane meshes.
 *
 * When printed with translucent CMYK filaments on a multi-material printer (e.g.,
 * Bambu Lab AMS, Prusa MMU) and backlit, the stacked layers recreate the original
 * image colors through subtractive color mixing.
 *
 * Algorithm reference: lithophanemaker.com "Printed Solid CMYK" palette.
 */

import {
  MeshEngineResult,
  ProgressCallback,
  LithoParams,
  WasmLithoModule,
  ColorMeshSet,
  CMYKChannel,
  COLOR_CHANNELS,
} from './types';

/** Per-pixel CMYK+W decomposition result (values 0–1) */
interface CMYKWPixel {
  c: number;
  m: number;
  y: number;
  k: number;
  w: number;
}

/**
 * Convert a single RGB pixel to CMYK+W using standard UCR (Under Color Removal).
 *
 * K = min(C, M, Y)  — "Key" absorbs equal parts of all colors
 * C', M', Y' = (X - K) / (1 - K) — remaining after K is subtracted
 * W = 1 - K — white channel controls light transmission (thicker = more light)
 */
export function rgbToCmykw(r: number, g: number, b: number): CMYKWPixel {
  // Normalize to 0–1
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  // CMY from inverse RGB
  let c = 1 - rn;
  let m = 1 - gn;
  let y = 1 - bn;

  // Key (black) is the minimum of CMY
  const k = Math.min(c, m, y);

  // Remove the K component from CMY
  if (k < 1) {
    const inv = 1 / (1 - k);
    c = (c - k) * inv;
    m = (m - k) * inv;
    y = (y - k) * inv;
  } else {
    // Pure black pixel
    c = 0;
    m = 0;
    y = 0;
  }

  // White channel: inverse of key — thicker white = more light passes through
  const w = 1 - k;

  return { c, m, y, k, w };
}

/**
 * Extract a single CMYK channel from the full image, producing a greyscale ImageData.
 *
 * Channel value 0 → pixel = 255 (white, thin/base thickness)
 * Channel value 1 → pixel = 0   (black, maximum thickness)
 *
 * This maps directly to how generate_lithophane interprets pixel brightness:
 * darker pixels = thicker mesh.
 */
function extractChannelImage(
  sourceData: Uint8ClampedArray,
  width: number,
  height: number,
  channel: CMYKChannel
): ImageData {
  const out = new ImageData(width, height);
  const data = out.data;

  for (let i = 0; i < sourceData.length; i += 4) {
    const r = sourceData[i];
    const g = sourceData[i + 1];
    const b = sourceData[i + 2];

    const cmykw = rgbToCmykw(r, g, b);

    let value: number;
    switch (channel) {
      case 'cyan':    value = cmykw.c; break;
      case 'magenta': value = cmykw.m; break;
      case 'yellow':  value = cmykw.y; break;
      case 'key':     value = cmykw.k; break;
      case 'white':   value = cmykw.w; break;
    }

    // Invert: channel value 1 → pixel 0 (dark = thick), value 0 → pixel 255 (light = thin)
    const grey = Math.round((1 - value) * 255);

    data[i]     = grey;
    data[i + 1] = grey;
    data[i + 2] = grey;
    data[i + 3] = 255;
  }

  return out;
}

/** Human-readable channel names for progress reporting */
const CHANNEL_LABELS: Record<CMYKChannel, string> = {
  cyan:    'Cyan (C)',
  magenta: 'Magenta (M)',
  yellow:  'Yellow (Y)',
  key:     'Key/Black (K)',
  white:   'White (W)',
};

/**
 * Generate a full CMYK+W color lithophane set.
 *
 * Produces 5 independent meshes, one per channel, by:
 * 1. Decomposing the source image into 5 greyscale channel images
 * 2. Calling the WASM lithophane engine for each channel
 *
 * All shapes are supported because we reuse the same WASM engine
 * that handles flat, arc, cylinder, sphere, heart, lampshade, vase, dome.
 */
export function generateColorLitho(
  imageData: ImageData,
  width: number,
  height: number,
  params: LithoParams,
  postProgress: ProgressCallback,
  wasmModule: WasmLithoModule
): ColorMeshSet {
  const results: Partial<Record<CMYKChannel, MeshEngineResult>> = {};

  // For each channel, extract greyscale image and generate mesh
  for (let i = 0; i < COLOR_CHANNELS.length; i++) {
    const channel = COLOR_CHANNELS[i];
    const baseProgress = (i / COLOR_CHANNELS.length) * 100;
    const channelWeight = 100 / COLOR_CHANNELS.length; // ~20% per channel

    postProgress(
      Math.round(baseProgress),
      `Generating ${CHANNEL_LABELS[channel]} layer...`
    );

    // Step 1: Extract channel greyscale image
    const channelImage = extractChannelImage(imageData.data, width, height, channel);

    // Step 2: Build params for this channel
    // - Invert is false because we already handled inversion in extractChannelImage
    // - For C/M/Y layers, we can optionally use a coarser resolution (coloredResolution)
    const channelParams: LithoParams = {
      ...params,
      invert: false, // channel extraction already handles polarity
      contrast: 1.0,
      brightness: 0.0,
      sharpness: 0.0,
    };

    // Apply colored resolution for C/M/Y if configured
    if (
      params.colorLithoParams &&
      (channel === 'cyan' || channel === 'magenta' || channel === 'yellow')
    ) {
      // coloredResolution is in mm — lower resolution = fewer vertices
      // We scale the effective resolution parameter proportionally
      const ratio = params.colorLithoParams.coloredResolution / 0.5; // 0.5mm is "normal" baseline
      if (ratio > 1) {
        channelParams.resolution = Math.max(
          Math.floor(params.resolution / ratio),
          50 // minimum mesh points per side
        );
      }
    }

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

  postProgress(100, 'All CMYK+W channels generated');

  return results as ColorMeshSet;
}
