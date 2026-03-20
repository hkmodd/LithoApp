import { create } from 'zustand';
import type { AppMode, LithoParams, MeshStats, ImageEdits, ColorMeshSet, ColorChannel, PaletteMeshSet } from '../workers/types';
import { defaultImageEdits, defaultColorLithoParams } from '../workers/types';
import { detectLocale } from '../i18n';
import type { SupportedLocale } from '../i18n';

// Re-export types so existing imports from the store still work
export type { AppMode, LithoParams, LithoShape, ImageEdits, ColorMeshSet, ColorChannel, PaletteMeshSet } from '../workers/types';
export { defaultImageEdits, defaultColorLithoParams } from '../workers/types';

// Persist / restore language from localStorage
const LANG_KEY = 'lithoapp-lang';
function getInitialLanguage(): SupportedLocale {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved) return saved as SupportedLocale;
  } catch { /* Safari private mode or quota error */ }
  return detectLocale();
}

interface AppState {
  // Language
  language: SupportedLocale;
  setLanguage: (lang: SupportedLocale) => void;

  // Global Mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Source Asset
  imageSrc: string | null;
  imageData: { data: ImageData; width: number; height: number } | null;
  setImage: (src: string | null, data: { data: ImageData; width: number; height: number } | null) => void;

  // Original image (for non-destructive editing)
  originalImage: HTMLImageElement | null;
  setOriginalImage: (img: HTMLImageElement | null) => void;

  // Image edits
  imageEdits: ImageEdits;
  updateImageEdits: (edits: Partial<ImageEdits>) => void;
  resetImageEdits: () => void;

  // Processing State
  isProcessing: boolean;
  isRegenerating: boolean;
  progress: { percent: number; message: string } | null;
  setProcessing: (isProcessing: boolean) => void;
  setRegenerating: (isRegenerating: boolean) => void;
  setProgress: (progress: { percent: number; message: string } | null) => void;

  // Output Mesh (single mesh modes: lithophane, extrusion)
  meshData: { positions: Float32Array; indices: Uint32Array; normals?: Float32Array; uvs?: Float32Array; thickness?: Float32Array; stats: MeshStats } | null;
  setMeshData: (data: { positions: Float32Array; indices: Uint32Array; normals?: Float32Array; uvs?: Float32Array; thickness?: Float32Array; stats: MeshStats } | null) => void;

  // Color Lithophane Output (5 channel meshes)
  colorMeshSet: ColorMeshSet | null;
  setColorMeshSet: (data: ColorMeshSet | null) => void;
  activeColorChannel: ColorChannel;
  setActiveColorChannel: (ch: ColorChannel) => void;

  // Palette Lithophane Output (per-filament meshes)
  paletteMeshSet: PaletteMeshSet | null;
  setPaletteMeshSet: (data: PaletteMeshSet | null) => void;

  // Lithophane Parameters
  lithoParams: LithoParams;
  /**
   * Update litho params. Pass `{ _skipHistory: true }` to prevent
   * the change from being recorded in the undo history (used by undo/redo).
   */
  updateLithoParams: (params: Partial<LithoParams> & { _skipHistory?: boolean }) => void;
  resetLithoParams: () => void;

  /** Internal flag: when true, the current param update should NOT be pushed to history */
  _skipHistory: boolean;

  // Worker ref — shared so ExportBar can post encode-stl messages
  meshWorker: Worker | null;
  setMeshWorker: (w: Worker | null) => void;
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
  colorLithoParams: { ...defaultColorLithoParams },
};

export const useAppStore = create<AppState>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (lang) => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
    set({ language: lang });
  },

  mode: 'lithophane',
  setMode: (mode) => set({ mode }),

  imageSrc: null,
  imageData: null,
  setImage: (src, data) => set({ imageSrc: src, imageData: data }),

  originalImage: null,
  setOriginalImage: (img) => set({ originalImage: img }),

  imageEdits: { ...defaultImageEdits },
  updateImageEdits: (edits) => set((state) => ({ imageEdits: { ...state.imageEdits, ...edits } })),
  resetImageEdits: () => set({ imageEdits: { ...defaultImageEdits } }),

  isProcessing: false,
  isRegenerating: false,
  progress: null,
  setProcessing: (isProcessing) => set({ isProcessing }),
  setRegenerating: (isRegenerating) => set({ isRegenerating }),
  setProgress: (progress) => set({ progress }),

  meshData: null,
  setMeshData: (data) => set({ meshData: data }),

  colorMeshSet: null,
  setColorMeshSet: (data) => set({ colorMeshSet: data }),
  activeColorChannel: 'white',
  setActiveColorChannel: (ch) => set({ activeColorChannel: ch }),

  paletteMeshSet: null,
  setPaletteMeshSet: (data) => set({ paletteMeshSet: data }),

  lithoParams: defaultLithoParams,
  updateLithoParams: (params) => {
    const { _skipHistory, ...cleanParams } = params;
    set((state) => ({
      lithoParams: { ...state.lithoParams, ...cleanParams },
      _skipHistory: !!_skipHistory,
    }));
  },
  resetLithoParams: () => set({ lithoParams: defaultLithoParams, _skipHistory: false }),

  _skipHistory: false,

  meshWorker: null,
  setMeshWorker: (w) => set({ meshWorker: w }),
}));
