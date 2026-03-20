/**
 * Palette store — Zustand state for filament library & AMS print configuration.
 *
 * Persists filament library & slot assignments to localStorage so users don't
 * have to reconfigure after refreshing.
 */

import { create } from 'zustand';
import type { Filament, AmsSlot, PrintConfig } from '../models/filamentPalette';
import { DEFAULT_FILAMENTS, getDefaultCmywFilaments } from '../data/defaultFilaments';

// ─── LocalStorage helpers ────────────────────────────────────────────────────

const LS_KEY_LIBRARY = 'lithoapp-filament-library';
const LS_KEY_SLOTS   = 'lithoapp-ams-slots';

function loadLibrary(): Filament[] {
  try {
    const raw = localStorage.getItem(LS_KEY_LIBRARY);
    if (raw) {
      const parsed = JSON.parse(raw) as Filament[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_FILAMENTS];
}

function saveLibrary(filaments: Filament[]): void {
  try { localStorage.setItem(LS_KEY_LIBRARY, JSON.stringify(filaments)); } catch { /* ignore */ }
}

function loadSlots(): AmsSlot[] {
  try {
    const raw = localStorage.getItem(LS_KEY_SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw) as AmsSlot[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  // Default: CMYW in 4 slots
  const cmyw = getDefaultCmywFilaments();
  return cmyw.map((f, i) => ({ slot: i + 1, filament: f }));
}

function saveSlots(slots: AmsSlot[]): void {
  try { localStorage.setItem(LS_KEY_SLOTS, JSON.stringify(slots)); } catch { /* ignore */ }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface PaletteState {
  /** Full filament library (defaults + user additions) */
  filamentLibrary: Filament[];
  /** Currently configured AMS slots */
  amsSlots: AmsSlot[];
  /** Max colour layers per pixel column */
  maxLayers: number;
  /** Layer height in mm */
  layerHeight: number;
  /** Whether the filament manager modal is open */
  isManagerOpen: boolean;
  /** Search/filter text in the filament manager */
  searchFilter: string;

  // ── Actions ──
  setManagerOpen: (open: boolean) => void;
  setSearchFilter: (text: string) => void;

  /** Add a filament to the library */
  addFilament: (filament: Filament) => void;
  /** Remove a filament from the library by ID */
  removeFilament: (id: string) => void;
  /** Update a filament in the library */
  updateFilament: (id: string, updates: Partial<Filament>) => void;
  /** Reset library to defaults */
  resetLibrary: () => void;

  /** Assign a filament to an AMS slot */
  assignSlot: (slotNumber: number, filament: Filament) => void;
  /** Clear an AMS slot */
  clearSlot: (slotNumber: number) => void;
  /** Add a new empty slot (for configurable slot count) */
  addSlot: () => void;
  /** Remove the last slot */
  removeSlot: () => void;
  /** Set max layers */
  setMaxLayers: (n: number) => void;
  /** Set layer height */
  setLayerHeight: (h: number) => void;

  /** Build a PrintConfig from current state */
  buildPrintConfig: () => PrintConfig | null;
}

export const usePaletteStore = create<PaletteState>((set, get) => ({
  filamentLibrary: loadLibrary(),
  amsSlots: loadSlots(),
  maxLayers: 5,
  layerHeight: 0.08,
  isManagerOpen: false,
  searchFilter: '',

  setManagerOpen: (open) => set({ isManagerOpen: open }),
  setSearchFilter: (text) => set({ searchFilter: text }),

  addFilament: (filament) => {
    const updated = [...get().filamentLibrary, filament];
    saveLibrary(updated);
    set({ filamentLibrary: updated });
  },

  removeFilament: (id) => {
    const updated = get().filamentLibrary.filter(f => f.id !== id);
    saveLibrary(updated);
    // Also remove from AMS slots if assigned
    const updatedSlots = get().amsSlots.filter(s => s.filament.id !== id);
    saveSlots(updatedSlots);
    set({ filamentLibrary: updated, amsSlots: updatedSlots });
  },

  updateFilament: (id, updates) => {
    const updatedLib = get().filamentLibrary.map(f =>
      f.id === id ? { ...f, ...updates } : f
    );
    saveLibrary(updatedLib);
    // Also update in AMS slots if assigned
    const updatedSlots = get().amsSlots.map(s =>
      s.filament.id === id ? { ...s, filament: { ...s.filament, ...updates } } : s
    );
    saveSlots(updatedSlots);
    set({ filamentLibrary: updatedLib, amsSlots: updatedSlots });
  },

  resetLibrary: () => {
    const defaults = [...DEFAULT_FILAMENTS];
    saveLibrary(defaults);
    set({ filamentLibrary: defaults });
  },

  assignSlot: (slotNumber, filament) => {
    const slots = get().amsSlots;
    const existing = slots.find(s => s.slot === slotNumber);
    let updated: AmsSlot[];
    if (existing) {
      updated = slots.map(s => s.slot === slotNumber ? { ...s, filament } : s);
    } else {
      updated = [...slots, { slot: slotNumber, filament }].sort((a, b) => a.slot - b.slot);
    }
    saveSlots(updated);
    set({ amsSlots: updated });
  },

  clearSlot: (slotNumber) => {
    const updated = get().amsSlots.filter(s => s.slot !== slotNumber);
    saveSlots(updated);
    set({ amsSlots: updated });
  },

  addSlot: () => {
    const slots = get().amsSlots;
    const nextNum = slots.length > 0 ? Math.max(...slots.map(s => s.slot)) + 1 : 1;
    // Don't add if we already have 8 slots
    if (nextNum > 8) return;
    // Default to white for new slots
    const defaultWhite = get().filamentLibrary.find(f => f.id === 'bambu-pla-basic-white');
    if (!defaultWhite) return;
    const updated = [...slots, { slot: nextNum, filament: defaultWhite }];
    saveSlots(updated);
    set({ amsSlots: updated });
  },

  removeSlot: () => {
    const slots = get().amsSlots;
    if (slots.length <= 1) return;
    const updated = slots.slice(0, -1);
    saveSlots(updated);
    set({ amsSlots: updated });
  },

  setMaxLayers: (n) => set({ maxLayers: Math.max(2, Math.min(10, n)) }),
  setLayerHeight: (h) => set({ layerHeight: Math.max(0.04, Math.min(0.32, h)) }),

  buildPrintConfig: () => {
    const { amsSlots, maxLayers, layerHeight, filamentLibrary } = get();
    if (amsSlots.length === 0) return null;

    // Find the white/lightest filament as base
    const whiteFilament = filamentLibrary.find(f => f.id === 'bambu-pla-basic-white')
      ?? amsSlots[0].filament;

    return {
      slots: amsSlots,
      maxLayers,
      layerHeight,
      baseFilament: whiteFilament,
    };
  },
}));
