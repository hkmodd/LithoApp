import { create } from 'zustand';

export type AppMode = 'lithophane' | 'extrusion' | 'cookie-cutter';
export type LithoShape = 'flat' | 'arc' | 'cylinder' | 'sphere' | 'heart';

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

interface AppState {
  // Global Mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Source Asset
  imageSrc: string | null;
  imageData: { data: ImageData; width: number; height: number } | null;
  setImage: (src: string | null, data: { data: ImageData; width: number; height: number } | null) => void;

  // Processing State
  isProcessing: boolean;
  progress: { percent: number; message: string } | null;
  setProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: { percent: number; message: string } | null) => void;

  // Output Mesh
  meshData: { positions: Float32Array; indices: Uint32Array; uvs?: Float32Array; stats: any } | null;
  setMeshData: (data: { positions: Float32Array; indices: Uint32Array; uvs?: Float32Array; stats: any } | null) => void;

  // Lithophane Parameters
  lithoParams: LithoParams;
  updateLithoParams: (params: Partial<LithoParams>) => void;
  resetLithoParams: () => void;
}

const defaultLithoParams: LithoParams = {
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

export const useAppStore = create<AppState>((set) => ({
  mode: 'lithophane',
  setMode: (mode) => set({ mode }),

  imageSrc: null,
  imageData: null,
  setImage: (src, data) => set({ imageSrc: src, imageData: data }),

  isProcessing: false,
  progress: null,
  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),

  meshData: null,
  setMeshData: (data) => set({ meshData: data }),

  lithoParams: defaultLithoParams,
  updateLithoParams: (params) => set((state) => ({ lithoParams: { ...state.lithoParams, ...params } })),
  resetLithoParams: () => set({ lithoParams: defaultLithoParams }),
}));
