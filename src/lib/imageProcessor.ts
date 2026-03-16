/**
 * Non-destructive image processing pipeline.
 * Takes the original image + edit state → returns processed pixels.
 *
 * Pipeline: crop → rotate → flip → gamma/exposure
 * All operations are composable on an offscreen canvas.
 */

import type { ImageEdits } from '../workers/types';

export interface ProcessedImage {
  src: string;
  data: ImageData;
  width: number;
  height: number;
}

export function applyEdits(original: HTMLImageElement, edits: ImageEdits): ProcessedImage {
  // 1. Determine source rect (crop)
  const srcW = original.naturalWidth;
  const srcH = original.naturalHeight;
  const crop = edits.cropRect ?? { x: 0, y: 0, w: 1, h: 1 };
  const cx = Math.round(crop.x * srcW);
  const cy = Math.round(crop.y * srcH);
  const cw = Math.round(crop.w * srcW);
  const ch = Math.round(crop.h * srcH);

  // 2. Determine output size after rotation
  const rotates90 = edits.rotation === 90 || edits.rotation === 270;
  const outW = rotates90 ? ch : cw;
  const outH = rotates90 ? cw : ch;

  // 3. Create canvas at output size
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  // 4. Apply transforms (rotate + flip) from center
  ctx.save();
  ctx.translate(outW / 2, outH / 2);

  // Rotation
  if (edits.rotation !== 0) {
    ctx.rotate((edits.rotation * Math.PI) / 180);
  }

  // Flip
  const sx = edits.flipH ? -1 : 1;
  const sy = edits.flipV ? -1 : 1;
  ctx.scale(sx, sy);

  // Draw: the image center goes to (0,0), so offset by -half of cropped size
  ctx.drawImage(original, cx, cy, cw, ch, -cw / 2, -ch / 2, cw, ch);
  ctx.restore();

  // 5. Apply gamma + exposure per-pixel
  const needsPixelEdit = edits.gamma !== 1.0 || edits.exposure !== 0.0;
  const imgData = ctx.getImageData(0, 0, outW, outH);

  if (needsPixelEdit) {
    applyGammaExposure(imgData, edits.gamma, edits.exposure);
    ctx.putImageData(imgData, 0, 0);
  }

  // 6. Output
  const src = canvas.toDataURL('image/png');
  return { src, data: imgData, width: outW, height: outH };
}

/**
 * In-place gamma + exposure adjustment.
 * exposure: linear brightness shift (-1..+1)
 * gamma: power curve (< 1 = brighter midtones, > 1 = darker midtones)
 */
function applyGammaExposure(imgData: ImageData, gamma: number, exposure: number): void {
  const d = imgData.data;
  // Pre-compute LUT for speed (256 entries)
  const lut = new Uint8Array(256);
  const invGamma = 1.0 / gamma;
  for (let i = 0; i < 256; i++) {
    let v = i / 255;
    // Apply exposure (linear shift, then clamp)
    v = v + exposure;
    v = Math.max(0, Math.min(1, v));
    // Apply gamma curve
    v = Math.pow(v, invGamma);
    lut[i] = Math.round(v * 255);
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i]     = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
    // alpha unchanged
  }
}

/** Check if edits differ from defaults (i.e., image is modified) */
export function hasEdits(edits: ImageEdits): boolean {
  return (
    edits.rotation !== 0 ||
    edits.flipH ||
    edits.flipV ||
    edits.cropRect !== null ||
    edits.gamma !== 1.0 ||
    edits.exposure !== 0.0
  );
}
