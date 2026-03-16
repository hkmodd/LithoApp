/**
 * useProjectStore — auto-save to localStorage + JSON export/import.
 *
 * What gets saved:
 *   • mode (lithophane | extrusion)
 *   • lithoParams (full parameter set)
 *   • imageSrc (base64 data URL — can be large!)
 *
 * Auto-save triggers on lithoParams changes (debounced 1s).
 * Manual save/load via named slots or JSON file download/upload.
 */

import { create } from 'zustand';
import { useAppStore } from './useAppStore';
import type { AppMode, LithoParams } from '../workers/types';

// ─── Types ────────────────────────────────────────────────────────

/** Serialized project envelope */
export interface ProjectData {
  /** Schema version for future migrations */
  version: 1;
  /** ISO timestamp */
  savedAt: string;
  /** Generation mode */
  mode: AppMode;
  /** All litho parameters */
  lithoParams: LithoParams;
  /** Base64 data-URL of the source image (nullable) */
  imageSrc: string | null;
}

interface ProjectState {
  /** Has the project been modified since last save? */
  isDirty: boolean;
  /** Last save timestamp (ISO) */
  lastSavedAt: string | null;
  /** Whether auto-save is enabled */
  autoSaveEnabled: boolean;

  // ─── Actions ──────────────────────────────────────────────────

  /** Mark project as dirty (modified) */
  markDirty: () => void;

  /** Save current project to localStorage */
  saveToLocal: () => void;

  /** Load project from localStorage (returns true if found) */
  loadFromLocal: () => boolean;

  /** Clear saved project from localStorage */
  clearLocal: () => void;

  /** Export project as downloadable JSON file */
  exportToFile: () => void;

  /** Import project from a JSON file */
  importFromFile: (file: File) => Promise<boolean>;

  /** Toggle auto-save */
  toggleAutoSave: () => void;
}

const STORAGE_KEY = 'lithoapp-project';

/** Capture current app state into a serializable envelope */
function captureProject(): ProjectData {
  const { mode, lithoParams, imageSrc } = useAppStore.getState();
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    mode,
    lithoParams: structuredClone(lithoParams),
    imageSrc,
  };
}

/** Restore a project snapshot into the app store */
function restoreProject(data: ProjectData): void {
  const { setMode, updateLithoParams, setImage } = useAppStore.getState();

  // Restore mode
  setMode(data.mode);

  // Restore params (with _skipHistory to avoid polluting undo stack)
  updateLithoParams({ ...data.lithoParams, _skipHistory: true });

  // Restore image — need to rebuild ImageData from the data URL
  if (data.imageSrc) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      setImage(data.imageSrc, { data: imageData, width: img.width, height: img.height });
    };
    img.src = data.imageSrc;
  } else {
    setImage(null, null);
  }
}

/** Validate that an object looks like a ProjectData */
function isValidProject(obj: unknown): obj is ProjectData {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    p.version === 1 &&
    typeof p.savedAt === 'string' &&
    typeof p.mode === 'string' &&
    typeof p.lithoParams === 'object' &&
    p.lithoParams !== null
  );
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  isDirty: false,
  lastSavedAt: null,
  autoSaveEnabled: true,

  markDirty: () => set({ isDirty: true }),

  saveToLocal: () => {
    try {
      const project = captureProject();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      set({ isDirty: false, lastSavedAt: project.savedAt });
    } catch (e) {
      // localStorage might be full (especially with large images)
      console.warn('[LithoApp] Failed to save project:', e);
    }
  },

  loadFromLocal: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!isValidProject(data)) return false;
      restoreProject(data);
      set({ isDirty: false, lastSavedAt: data.savedAt });
      return true;
    } catch {
      return false;
    }
  },

  clearLocal: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ isDirty: false, lastSavedAt: null });
  },

  exportToFile: () => {
    const project = captureProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lithoapp-project-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Saving to file also clears dirty flag
    set({ isDirty: false, lastSavedAt: project.savedAt });
  },

  importFromFile: async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!isValidProject(data)) return false;
      restoreProject(data);
      set({ isDirty: false, lastSavedAt: data.savedAt });
      return true;
    } catch {
      return false;
    }
  },

  toggleAutoSave: () => set((s) => ({ autoSaveEnabled: !s.autoSaveEnabled })),
}));
