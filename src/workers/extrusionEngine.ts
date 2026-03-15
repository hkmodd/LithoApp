import { MeshEngineResult, ProgressCallback } from './types';
import { generateLithophane } from './lithophaneEngine';

export function generateExtrusion(
  imageData: ImageData,
  width: number,
  height: number,
  params: any,
  postProgress: ProgressCallback
): MeshEngineResult {
  postProgress(5, 'Thresholding image for extrusion...');

  // Create a copy of the image data to modify
  const newImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height
  );

  const threshold = params.threshold !== undefined ? params.threshold : 128;
  const invert = params.invert || false;

  // Apply binary threshold
  for (let i = 0; i < newImageData.data.length; i += 4) {
    const r = newImageData.data[i];
    const g = newImageData.data[i + 1];
    const b = newImageData.data[i + 2];
    
    // Calculate luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Determine if it's "foreground" (raised) or "background" (base)
    // By default, darker pixels are usually the logo/text.
    let isForeground = lum < threshold;
    if (invert) isForeground = !isForeground;

    // Set to pure black (raised) or pure white (base)
    // The lithophane engine maps black to maxThickness and white to baseThickness (if not inverted in litho params)
    const val = isForeground ? 0 : 255;
    
    newImageData.data[i] = val;
    newImageData.data[i + 1] = val;
    newImageData.data[i + 2] = val;
    newImageData.data[i + 3] = 255; // Alpha opaque
  }

  // We reuse the lithophane engine but with the thresholded image!
  // We force invert to false because we already handled it above.
  // We also force high smoothing to slightly bevel the edges for better 3D printing.
  const extrusionParams = {
    ...params,
    invert: false, 
    smoothing: params.smoothing !== undefined ? params.smoothing : 2,
    contrast: 1.0,
    brightness: 0.0,
    sharpness: 0.0
  };

  return generateLithophane(newImageData, width, height, extrusionParams, postProgress);
}
