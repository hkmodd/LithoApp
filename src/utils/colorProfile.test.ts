import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateColorProfile } from './colorProfile';
import type { LithoParams } from '../store/useAppStore';

// This module relies on Image, Canvas2D, and toDataURL — all DOM APIs.
// In a jsdom/happy-dom test environment, these are partially available.
// We test the rejection path and basic invocation; full visual testing
// would need a canvas-capable environment (e.g., vitest-browser or Playwright).

describe('colorProfile', () => {
  const baseParams: LithoParams = {
    shape: 'flat',
    resolution: 256,
    physicalSize: 100,
    baseThickness: 0.8,
    maxThickness: 3.2,
    borderWidth: 3.0,
    frameThickness: 5.0,
    baseStand: 0.0,
    curveAngle: 120,
    smoothing: 1,
    contrast: 1.0,
    brightness: 0.0,
    sharpness: 0.0,
    invert: false,
    hanger: false,
    threshold: 128,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects when given an invalid (empty) image URL', async () => {
    // The Image element will fire onerror for an invalid src
    await expect(generateColorProfile('', baseParams)).rejects.toThrow();
  });

  it('rejects when the URL cannot be loaded', async () => {
    await expect(
      generateColorProfile('data:image/png;base64,INVALID_DATA_THAT_WONT_LOAD', baseParams)
    ).rejects.toThrow();
  });

  it('is an async function that returns a Promise', () => {
    const result = generateColorProfile('test', baseParams);
    expect(result).toBeInstanceOf(Promise);
    // Suppress unhandled rejection — this URL is invalid and will reject
    result.catch(() => {});
  });
});
