/**
 * useCropStore — shared crop state between ImageEditor controls and CropOverlay.
 * 
 * ImageEditor controls toggle/apply/cancel cropping.
 * CropOverlay renders the visual crop rectangle on the image preview.
 * Both consume this store.
 */

import { create } from 'zustand';

interface CropRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface CropState {
  /** Whether crop mode is active */
  isCropping: boolean;
  /** Current crop rectangle (normalized 0–1) */
  rect: CropRect;

  /** Start crop mode */
  startCrop: (existing?: { x: number; y: number; w: number; h: number } | null) => void;
  /** Update crop rectangle during drag */
  updateRect: (update: Partial<CropRect>) => void;
  /** Set full rect */
  setRect: (rect: CropRect) => void;
  /** Cancel crop mode */
  cancelCrop: () => void;
  /** Signal that crop should be applied (caller reads rect and applies) */
  stopCrop: () => void;
}

export const useCropStore = create<CropState>((set) => ({
  isCropping: false,
  rect: { startX: 0.05, startY: 0.05, endX: 0.95, endY: 0.95 },

  startCrop: (existing) => {
    set({
      isCropping: true,
      rect: existing
        ? { startX: existing.x, startY: existing.y, endX: existing.x + existing.w, endY: existing.y + existing.h }
        : { startX: 0.05, startY: 0.05, endX: 0.95, endY: 0.95 },
    });
  },

  updateRect: (update) =>
    set((s) => ({ rect: { ...s.rect, ...update } })),

  setRect: (rect) => set({ rect }),

  cancelCrop: () => set({ isCropping: false }),

  stopCrop: () => set({ isCropping: false }),
}));
