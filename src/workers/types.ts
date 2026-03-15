// Core engine interface for different generation modes
export interface MeshEngineResult {
  positions: Float32Array;
  indices: Uint32Array;
  uvs?: Float32Array;
  stats: {
    vertices: number;
    triangles: number;
    bbox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    width: number;
    height: number;
  };
}

export interface WorkerMessage {
  mode: 'lithophane' | 'extrusion' | 'cookie-cutter';
  imageData: ImageData;
  width: number;
  height: number;
  params: any;
}

export type ProgressCallback = (progress: number, message: string) => void;
