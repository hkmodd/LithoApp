// Core engine interface for different generation modes

export type AppMode = 'lithophane' | 'extrusion' | 'cookie-cutter';
export type LithoShape = 'flat' | 'arc' | 'cylinder' | 'sphere' | 'heart' | 'lampshade' | 'vase' | 'dome';

/** Non-destructive image edits applied before engine processing */
export interface ImageEdits {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  cropRect: { x: number; y: number; w: number; h: number } | null; // normalized 0–1
  gamma: number;      // default 1.0, range 0.2–3.0
  exposure: number;   // default 0.0, range -1.0–+1.0
}

export const defaultImageEdits: ImageEdits = {
  rotation: 0,
  flipH: false,
  flipV: false,
  cropRect: null,
  gamma: 1.0,
  exposure: 0.0,
};

export interface LithoParams {
  shape: LithoShape;
  resolution: number;
  physicalSize: number;
  baseThickness: number;
  maxThickness: number;
  borderWidth: number;
  frameThickness: number;
  baseStand: number;
  curveAngle: number;
  smoothing: number;
  contrast: number;
  brightness: number;
  sharpness: number;
  invert: boolean;
  hanger: boolean;
  threshold: number;
}

export interface MeshStats {
  vertices: number;
  triangles: number;
  bbox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  width: number;
  height: number;
}

export interface MeshEngineResult {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs?: Float32Array;
  thickness?: Float32Array;
  stats: MeshStats;
}

export interface WorkerRequest {
  id: number; // generation counter for race-condition prevention
  mode: AppMode | 'encode-stl';
  imageData: ImageData;
  width: number;
  height: number;
  params: LithoParams;
  // STL encoding fields (only used when mode === 'encode-stl')
  stlPositions?: Float32Array;
  stlIndices?: Uint32Array;
}

export type WorkerResponse =
  | { type: 'progress'; id: number; progress: number; message: string }
  | { type: 'complete'; id: number; positions: Float32Array; indices: Uint32Array; normals: Float32Array; uvs?: Float32Array; thickness?: Float32Array; stats: MeshStats }
  | { type: 'stl-complete'; id: number; stlBuffer: Uint8Array }
  | { type: 'error'; id: number; message: string };

export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Typed interface for the WASM lithophane engine module.
 * This removes all `any` usage in meshWorker.ts and extrusionEngine.ts.
 */
export interface WasmLithoModule {
  generate_lithophane(
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    params: LithoParams,
    postProgress: ProgressCallback
  ): {
    positions: Float32Array;
    indices: Uint32Array;
    uvs: Float32Array;
    normals: Float32Array;
    stats: MeshStats;
  };

  /** Encode positions + indices into binary STL. Runs in WASM. */
  encode_stl(
    positions: Float32Array,
    indices: Uint32Array,
  ): Uint8Array;
}

