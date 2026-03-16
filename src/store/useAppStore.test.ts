// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset the store to defaults between tests
    const store = useAppStore.getState();
    store.resetLithoParams();
    store.setMode('lithophane');
    store.setImage(null, null);
    store.setMeshData(null);
    store.setProcessing(false);
    store.setProgress(null);
    localStorage.clear();
  });

  it('initializes with default lithoParams', () => {
    const { lithoParams } = useAppStore.getState();
    expect(lithoParams.shape).toBe('flat');
    expect(lithoParams.resolution).toBe(256);
    expect(lithoParams.physicalSize).toBe(100);
    expect(lithoParams.baseThickness).toBe(0.8);
    expect(lithoParams.maxThickness).toBe(3.2);
    expect(lithoParams.invert).toBe(false);
    expect(lithoParams.hanger).toBe(false);
    expect(lithoParams.threshold).toBe(128);
  });

  it('initializes with default mode "lithophane"', () => {
    expect(useAppStore.getState().mode).toBe('lithophane');
  });

  it('updates mode with setMode', () => {
    useAppStore.getState().setMode('extrusion');
    expect(useAppStore.getState().mode).toBe('extrusion');
  });

  it('partially updates lithoParams with updateLithoParams', () => {
    useAppStore.getState().updateLithoParams({ shape: 'cylinder', resolution: 512 });
    const { lithoParams } = useAppStore.getState();
    expect(lithoParams.shape).toBe('cylinder');
    expect(lithoParams.resolution).toBe(512);
    // Other params remain default
    expect(lithoParams.baseThickness).toBe(0.8);
  });

  it('resetLithoParams restores all defaults', () => {
    useAppStore.getState().updateLithoParams({ shape: 'heart', resolution: 1024 });
    useAppStore.getState().resetLithoParams();
    const { lithoParams } = useAppStore.getState();
    expect(lithoParams.shape).toBe('flat');
    expect(lithoParams.resolution).toBe(256);
  });

  it('setImage updates both imageSrc and imageData', () => {
    const fakeData = { data: {} as ImageData, width: 100, height: 100 };
    useAppStore.getState().setImage('blob:test', fakeData);
    const { imageSrc, imageData } = useAppStore.getState();
    expect(imageSrc).toBe('blob:test');
    expect(imageData).toBe(fakeData);
  });

  it('setImage(null, null) clears the image', () => {
    useAppStore.getState().setImage('blob:test', { data: {} as ImageData, width: 1, height: 1 });
    useAppStore.getState().setImage(null, null);
    expect(useAppStore.getState().imageSrc).toBeNull();
    expect(useAppStore.getState().imageData).toBeNull();
  });

  it('setProcessing toggles isProcessing', () => {
    useAppStore.getState().setProcessing(true);
    expect(useAppStore.getState().isProcessing).toBe(true);
    useAppStore.getState().setProcessing(false);
    expect(useAppStore.getState().isProcessing).toBe(false);
  });

  it('setProgress updates and clears progress', () => {
    useAppStore.getState().setProgress({ percent: 42, message: 'Computing...' });
    expect(useAppStore.getState().progress).toEqual({ percent: 42, message: 'Computing...' });
    useAppStore.getState().setProgress(null);
    expect(useAppStore.getState().progress).toBeNull();
  });

  it('setMeshData stores mesh output', () => {
    const data = {
      positions: new Float32Array([0, 0, 0]),
      indices: new Uint32Array([0]),
      stats: { vertices: 1, triangles: 0, bbox: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }, width: 0, height: 0 },
    };
    useAppStore.getState().setMeshData(data);
    expect(useAppStore.getState().meshData).toBe(data);
  });

  it('setLanguage persists to localStorage', () => {
    useAppStore.getState().setLanguage('it');
    expect(useAppStore.getState().language).toBe('it');
    expect(localStorage.getItem('lithoapp-lang')).toBe('it');
  });
});
