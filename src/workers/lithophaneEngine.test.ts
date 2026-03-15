import { describe, it, expect, vi } from 'vitest';
import { generateLithophane } from './lithophaneEngine';

describe('Lithophane Engine Core', () => {
  // Mock a 10x10 white image (100 pixels, 4 channels = 400 bytes)
  const mockImageData = {
    width: 10,
    height: 10,
    data: new Uint8ClampedArray(400).fill(255)
  } as unknown as ImageData;

  const mockProgress = vi.fn();

  const baseParams = {
    resolution: 10, // Small resolution for fast testing
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
    sharpness: 0
  };

  it('generates a flat lithophane successfully', () => {
    const result = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'flat' }, mockProgress);
    
    expect(result.positions).toBeDefined();
    expect(result.indices).toBeDefined();
    expect(result.stats.vertices).toBeGreaterThan(0);
    expect(result.stats.triangles).toBeGreaterThan(0);
    
    // Ensure no NaN values in positions
    const hasNaN = result.positions.some(p => isNaN(p));
    expect(hasNaN).toBe(false, 'Positions array contains NaN values');
  });

  it('generates a cylinder successfully', () => {
    const result = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'cylinder' }, mockProgress);
    
    expect(result.positions).toBeDefined();
    const hasNaN = result.positions.some(p => isNaN(p));
    expect(hasNaN).toBe(false, 'Cylinder positions array contains NaN values');
  });

  it('generates an arc successfully', () => {
    const result = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'arc', curveAngle: 180 }, mockProgress);
    
    expect(result.positions).toBeDefined();
    const hasNaN = result.positions.some(p => isNaN(p));
    expect(hasNaN).toBe(false, 'Arc positions array contains NaN values');
  });

  it('generates a sphere successfully', () => {
    const result = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'sphere' }, mockProgress);
    
    expect(result.positions).toBeDefined();
    const hasNaN = result.positions.some(p => isNaN(p));
    expect(hasNaN).toBe(false, 'Sphere positions array contains NaN values');
  });

  it('generates a heart successfully', () => {
    const result = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'heart' }, mockProgress);
    
    expect(result.positions).toBeDefined();
    const hasNaN = result.positions.some(p => isNaN(p));
    expect(hasNaN).toBe(false, 'Heart positions array contains NaN values');
  });

  it('generates a hanger successfully', () => {
    const resultWithoutHanger = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'flat', hanger: false }, mockProgress);
    const resultWithHanger = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'flat', hanger: true }, mockProgress);
    
    expect(resultWithHanger.stats.vertices).toBeGreaterThan(resultWithoutHanger.stats.vertices);
    expect(resultWithHanger.stats.triangles).toBeGreaterThan(resultWithoutHanger.stats.triangles);
    
    const hasNaN = resultWithHanger.positions.some(p => isNaN(p));
    expect(hasNaN).toBe(false, 'Hanger positions array contains NaN values');
  });

  it('calculates bounding box correctly', () => {
    const result = generateLithophane(mockImageData, 10, 10, { ...baseParams, shape: 'flat' }, mockProgress);
    
    expect(result.stats.bbox.minX).toBeLessThanOrEqual(result.stats.bbox.maxX);
    expect(result.stats.bbox.minY).toBeLessThanOrEqual(result.stats.bbox.maxY);
    expect(result.stats.bbox.minZ).toBeLessThanOrEqual(result.stats.bbox.maxZ);
    
    // For a flat lithophane of physicalSize 100 on a 10x10 grid, the scale is 100/10 = 10.
    // The X coordinates go from (0 - 5)*10 = -50 to (9 - 5)*10 = 40.
    expect(result.stats.bbox.maxX).toBeCloseTo(40, 0);
    expect(result.stats.bbox.minX).toBeCloseTo(-50, 0);
  });
});
