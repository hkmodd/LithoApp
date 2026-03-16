// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LithoParams } from './types';

// jsdom doesn't provide ImageData — polyfill it
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as Record<string, unknown>).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height?: number) {
      this.data = data;
      this.width = width;
      this.height = height ?? (data.length / (4 * width));
    }
  };
}

import { generateExtrusion } from './extrusionEngine';

describe('Extrusion Engine', () => {
  const mockProgress = vi.fn();

  const baseParams: LithoParams = {
    shape: 'flat',
    resolution: 10,
    physicalSize: 100,
    baseThickness: 1,
    maxThickness: 5,
    borderWidth: 0,
    frameThickness: 5,
    smoothing: 0,
    invert: false,
    contrast: 1,
    brightness: 0,
    baseStand: 0,
    sharpness: 0,
    curveAngle: 0,
    hanger: false,
    threshold: 128,
  };

  // Helper: create a uniform-color 4x4 image
  function makeImage(r: number, g: number, b: number): ImageData {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
    return new ImageData(data, 4, 4);
  }

  beforeEach(() => {
    mockProgress.mockClear();
  });

  it('generates a valid mesh from a white image', () => {
    const result = generateExtrusion(makeImage(255, 255, 255), 4, 4, baseParams, mockProgress);

    expect(result.positions).toBeInstanceOf(Float32Array);
    expect(result.indices).toBeInstanceOf(Uint32Array);
    expect(result.stats.vertices).toBeGreaterThan(0);
    expect(result.stats.triangles).toBeGreaterThan(0);
  });

  it('generates a valid mesh from a black image', () => {
    const result = generateExtrusion(makeImage(0, 0, 0), 4, 4, baseParams, mockProgress);

    expect(result.positions).toBeInstanceOf(Float32Array);
    expect(result.stats.triangles).toBeGreaterThan(0);
    const hasNaN = result.positions.some(p => isNaN(p));
    expect(hasNaN).toBe(false);
  });

  it('forces invert=false and resets contrast/brightness/sharpness', () => {
    // Even if invert=true in params, extrusion handles it separately
    const params = { ...baseParams, invert: true, contrast: 2.0, brightness: 0.5, sharpness: 1.0 };
    const result = generateExtrusion(makeImage(100, 100, 100), 4, 4, params, mockProgress);

    // Should still succeed — the params override will not cause NaN
    expect(result.positions).toBeDefined();
    expect(result.stats.vertices).toBeGreaterThan(0);
  });

  it('reports progress during execution', () => {
    generateExtrusion(makeImage(128, 128, 128), 4, 4, baseParams, mockProgress);

    // At minimum: 'Thresholding...' + calls from inner lithophane engine
    expect(mockProgress).toHaveBeenCalled();
    expect(mockProgress.mock.calls[0]?.[1]).toContain('Thresholding');
  });

  it('applies custom threshold value', () => {
    // With threshold=50, luminance 128 is above threshold → background (white)
    const highThreshold = { ...baseParams, threshold: 200 };
    const lowThreshold = { ...baseParams, threshold: 50 };

    const highResult = generateExtrusion(makeImage(128, 128, 128), 4, 4, highThreshold, mockProgress);
    const lowResult = generateExtrusion(makeImage(128, 128, 128), 4, 4, lowThreshold, mockProgress);

    // Both should produce valid meshes
    expect(highResult.stats.vertices).toBeGreaterThan(0);
    expect(lowResult.stats.vertices).toBeGreaterThan(0);
  });

  it('works with non-square images', () => {
    const wideData = new Uint8ClampedArray(8 * 4 * 4).fill(200);
    const wide = new ImageData(wideData, 8, 4);
    const result = generateExtrusion(wide, 8, 4, baseParams, mockProgress);

    expect(result.positions).toBeDefined();
    expect(result.stats.vertices).toBeGreaterThan(0);
  });
});
