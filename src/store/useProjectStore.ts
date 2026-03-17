/**
 * useProjectStore — auto-save to localStorage + JSON export/import
 *                    + multi-slot project history via IndexedDB.
 *
 * What gets saved:
 *   • mode (lithophane | extrusion | color-litho)
 *   • lithoParams (full parameter set)
 *   • imageEdits (non-destructive transforms)
 *   • imageSrc (base64 data URL — can be large!)
 *
 * Auto-save triggers on lithoParams changes (debounced 1s).
 * Manual save/load via named slots or JSON file download/upload.
 *
 * History gallery:
 *   • Index (ProjectSlot[]) stored in localStorage (lightweight)
 *   • Full project data stored in IndexedDB via idb-keyval (large capacity)
 *   • Cache budget ~50 MB, oldest-first eviction
 *   • Auto-snapshot before loading a new image
 */

import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';
import { useAppStore } from './useAppStore';
import type { AppMode, LithoParams, ImageEdits } from '../workers/types';

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
  /** Non-destructive image edits */
  imageEdits?: ImageEdits;
  /** Base64 data-URL of the source image (nullable) */
  imageSrc: string | null;
}

/** Lightweight metadata for a saved project slot (stored in localStorage) */
export interface ProjectSlot {
  /** Unique identifier */
  id: string;
  /** User-visible project name */
  name: string;
  /** Tiny JPEG data-URL thumbnail (~200px wide, 5-15KB) */
  thumbnail: string | null;
  /** ISO timestamp */
  savedAt: string;
  /** Generation mode at save time */
  mode: AppMode;
  /** Approximate size of the full project data in bytes */
  sizeBytes: number;
}

interface ProjectState {
  /** Has the project been modified since last save? */
  isDirty: boolean;
  /** Last save timestamp (ISO) */
  lastSavedAt: string | null;
  /** Whether auto-save is enabled */
  autoSaveEnabled: boolean;

  // ─── History gallery ────────────────────────────────────────────
  /** Metadata for all saved project slots (lightweight) */
  projectHistory: ProjectSlot[];
  /** Whether history has been loaded from storage */
  historyLoaded: boolean;

  // ─── Actions (original) ─────────────────────────────────────────

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

  // ─── Actions (history gallery) ──────────────────────────────────

  /** Load history index from localStorage on mount */
  loadHistory: () => void;
  /** Save current project state as a new history slot */
  saveToHistory: (name?: string) => Promise<void>;
  /** Restore a project from a history slot */
  loadFromHistory: (id: string) => Promise<boolean>;
  /** Delete a single history slot */
  deleteFromHistory: (id: string) => Promise<void>;
  /** Rename a history slot */
  renameHistorySlot: (id: string, newName: string) => void;
  /** Delete all history slots */
  clearAllHistory: () => Promise<void>;
  /** Get total cache usage in bytes */
  getCacheUsageBytes: () => number;
}

// ─── Constants ────────────────────────────────────────────────────

const STORAGE_KEY = 'lithoapp-project';
const HISTORY_INDEX_KEY = 'lithoapp-history-index';
const IDB_PREFIX = 'lithoapp-hist-';
const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50 MB
const THUMBNAIL_MAX_WIDTH = 200;
const THUMBNAIL_QUALITY = 0.6;

// ─── Helpers ──────────────────────────────────────────────────────

/** Generate a short unique ID based on timestamp + random suffix */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Generate a friendly project name from the current date/time */
function generateName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Project ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Create a tiny thumbnail from a base64 image src */
async function generateThumbnail(imageSrc: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

/** Capture current app state into a serializable envelope */
function captureProject(): ProjectData {
  const { mode, lithoParams, imageSrc, imageEdits } = useAppStore.getState();
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    mode,
    lithoParams: structuredClone(lithoParams),
    imageEdits: structuredClone(imageEdits),
    imageSrc,
  };
}

/** Restore a project snapshot into the app store */
function restoreProject(data: ProjectData): void {
  const { setMode, updateLithoParams, setImage, updateImageEdits, setOriginalImage } = useAppStore.getState();

  // Restore mode
  setMode(data.mode);

  // Restore params (with _skipHistory to avoid polluting undo stack)
  updateLithoParams({ ...data.lithoParams, _skipHistory: true });

  // Restore image edits
  if (data.imageEdits) {
    updateImageEdits(data.imageEdits);
  }

  // Restore image — need to rebuild ImageData from the data URL
  if (data.imageSrc) {
    const img = new Image();
    img.onload = () => {
      // Also set as original image for non-destructive editing
      setOriginalImage(img);

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

/** Persist history index to localStorage */
function persistHistoryIndex(slots: ProjectSlot[]): void {
  try {
    localStorage.setItem(HISTORY_INDEX_KEY, JSON.stringify(slots));
  } catch (e) {
    console.warn('[LithoApp] Failed to persist history index:', e);
  }
}

/** Evict oldest history slots until total size fits within budget */
async function evictIfNeeded(slots: ProjectSlot[]): Promise<ProjectSlot[]> {
  let totalBytes = slots.reduce((sum, s) => sum + s.sizeBytes, 0);
  const result = [...slots];

  while (totalBytes > MAX_CACHE_BYTES && result.length > 0) {
    // Remove the oldest (first) slot
    const oldest = result.shift()!;
    totalBytes -= oldest.sizeBytes;
    try {
      await idbDel(IDB_PREFIX + oldest.id);
    } catch {
      // Ignore — the slot data may already be gone
    }
    console.info(`[LithoApp] Cache eviction: removed "${oldest.name}" (${(oldest.sizeBytes / 1024).toFixed(0)}KB)`);
  }

  return result;
}

// ─── Store ────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  isDirty: false,
  lastSavedAt: null,
  autoSaveEnabled: true,

  // History gallery
  projectHistory: [],
  historyLoaded: false,

  // ─── Original actions ──────────────────────────────────────────

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

  // ─── History gallery actions ────────────────────────────────────

  loadHistory: () => {
    try {
      const raw = localStorage.getItem(HISTORY_INDEX_KEY);
      if (raw) {
        const slots: ProjectSlot[] = JSON.parse(raw);
        set({ projectHistory: slots, historyLoaded: true });
      } else {
        set({ historyLoaded: true });
      }
    } catch {
      set({ historyLoaded: true });
    }
  },

  saveToHistory: async (name?: string) => {
    const project = captureProject();
    // Don't save empty projects (no image)
    if (!project.imageSrc) return;

    const id = generateId();
    const projectName = name || generateName();
    const thumbnail = await generateThumbnail(project.imageSrc);
    const jsonStr = JSON.stringify(project);
    const sizeBytes = new Blob([jsonStr]).size;

    // Store full project data in IndexedDB
    try {
      await idbSet(IDB_PREFIX + id, jsonStr);
    } catch (e) {
      console.warn('[LithoApp] Failed to save project to IndexedDB:', e);
      return;
    }

    const slot: ProjectSlot = {
      id,
      name: projectName,
      thumbnail,
      savedAt: project.savedAt,
      mode: project.mode,
      sizeBytes,
    };

    // Append to history and evict if over budget
    let history = [...get().projectHistory, slot];
    history = await evictIfNeeded(history);

    persistHistoryIndex(history);
    set({ projectHistory: history });
  },

  loadFromHistory: async (id: string): Promise<boolean> => {
    try {
      const raw = await idbGet<string>(IDB_PREFIX + id);
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

  deleteFromHistory: async (id: string) => {
    try {
      await idbDel(IDB_PREFIX + id);
    } catch {
      // Ignore
    }
    const history = get().projectHistory.filter((s) => s.id !== id);
    persistHistoryIndex(history);
    set({ projectHistory: history });
  },

  renameHistorySlot: (id: string, newName: string) => {
    const history = get().projectHistory.map((s) =>
      s.id === id ? { ...s, name: newName.trim() || s.name } : s
    );
    persistHistoryIndex(history);
    set({ projectHistory: history });
  },

  clearAllHistory: async () => {
    const { projectHistory } = get();
    // Delete all from IndexedDB
    for (const slot of projectHistory) {
      try {
        await idbDel(IDB_PREFIX + slot.id);
      } catch {
        // Ignore
      }
    }
    localStorage.removeItem(HISTORY_INDEX_KEY);
    set({ projectHistory: [] });
  },

  getCacheUsageBytes: () => {
    return get().projectHistory.reduce((sum, s) => sum + s.sizeBytes, 0);
  },
}));
