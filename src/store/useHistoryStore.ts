import { create } from 'zustand';
import type { LithoParams } from '../workers/types';

/** Maximum number of undo steps to keep in memory */
const MAX_HISTORY = 50;

interface HistoryState {
  /** Previous parameter snapshots (oldest first) */
  past: LithoParams[];
  /** Current snapshot (the one the user sees right now) */
  present: LithoParams | null;
  /** Snapshots that were undone and can be redone */
  future: LithoParams[];
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;

  /**
   * Initialize the history with the current params.
   * Called once when the app mounts.
   */
  init: (params: LithoParams) => void;

  /**
   * Push a new snapshot into the history.
   * Clears the future (branching) and caps the past at MAX_HISTORY.
   */
  push: (params: LithoParams) => void;

  /**
   * Undo: move present → future, pop past → present.
   * Returns the restored LithoParams, or null if nothing to undo.
   */
  undo: () => LithoParams | null;

  /**
   * Redo: move present → past, pop future → present.
   * Returns the restored LithoParams, or null if nothing to redo.
   */
  redo: () => LithoParams | null;

  /**
   * Clear all history (e.g. on project reset).
   */
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  present: null,
  future: [],
  canUndo: false,
  canRedo: false,

  init: (params) => {
    set({
      past: [],
      present: structuredClone(params),
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },

  push: (params) => {
    const state = get();
    if (!state.present) {
      // First push — just set present
      set({
        present: structuredClone(params),
        canUndo: false,
        canRedo: false,
      });
      return;
    }

    // Don't push if params are identical to present (no-op change)
    if (paramsEqual(state.present, params)) return;

    const newPast = [...state.past, state.present];
    // Cap history at MAX_HISTORY entries
    if (newPast.length > MAX_HISTORY) {
      newPast.splice(0, newPast.length - MAX_HISTORY);
    }

    set({
      past: newPast,
      present: structuredClone(params),
      future: [], // branching — discard redo stack
      canUndo: true,
      canRedo: false,
    });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0 || !state.present) return null;

    const previousPast = [...state.past];
    const restored = previousPast.pop()!;

    set({
      past: previousPast,
      present: restored,
      future: [state.present, ...state.future],
      canUndo: previousPast.length > 0,
      canRedo: true,
    });

    return structuredClone(restored);
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0 || !state.present) return null;

    const remainingFuture = [...state.future];
    const restored = remainingFuture.shift()!;

    set({
      past: [...state.past, state.present],
      present: restored,
      future: remainingFuture,
      canUndo: true,
      canRedo: remainingFuture.length > 0,
    });

    return structuredClone(restored);
  },

  clear: () => {
    set({
      past: [],
      present: null,
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Shallow comparison of all LithoParams fields.
 * Fast path: avoids JSON.stringify by comparing field-by-field.
 */
function paramsEqual(a: LithoParams, b: LithoParams): boolean {
  return (
    a.shape === b.shape &&
    a.resolution === b.resolution &&
    a.physicalSize === b.physicalSize &&
    a.baseThickness === b.baseThickness &&
    a.maxThickness === b.maxThickness &&
    a.borderWidth === b.borderWidth &&
    a.frameThickness === b.frameThickness &&
    a.baseStand === b.baseStand &&
    a.curveAngle === b.curveAngle &&
    a.smoothing === b.smoothing &&
    a.contrast === b.contrast &&
    a.brightness === b.brightness &&
    a.sharpness === b.sharpness &&
    a.invert === b.invert &&
    a.hanger === b.hanger &&
    a.threshold === b.threshold
  );
}
