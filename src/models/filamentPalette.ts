/**
 * Filament Palette System — Type definitions for real-filament printing
 *
 * Models actual 3D printing filaments with measured colour and transmission
 * properties. Compatible with HueForge TD values and PIXEstL palette format.
 */

import type { RGB, Lab } from '../utils/colorScience';
import { hexToRgb, rgbToLab, rgbToHex } from '../utils/colorScience';

// ─── Core Types ──────────────────────────────────────────────────────────────

/** A real filament with measured optical properties */
export interface Filament {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Human-readable name, e.g. "Bambu PLA Basic Cyan" */
  name: string;
  /** Hex colour as printed/measured, e.g. "#0086D6" */
  hexColor: string;
  /**
   * Transmission Distance in mm.
   *
   * The thickness at which light penetration is no longer perceptible.
   * Higher = more translucent filament.
   * Typical range: 0.3 (black) to 5.0+ (white/translucent).
   *
   * Compatible with HueForge TD calibration.
   */
  td: number;
  /** Brand name, e.g. "Bambu Lab" */
  brand: string;
  /** Material type, e.g. "PLA Basic", "PLA Matte", "PETG" */
  material: string;
  /** Whether this filament is user-calibrated (vs default values) */
  isCalibrated?: boolean;
}

/** A filament assigned to a specific AMS/MMU slot */
export interface AmsSlot {
  /** 1-based slot number */
  slot: number;
  /** The filament loaded in this slot */
  filament: Filament;
}

/**
 * Complete print configuration for palette-mode colour lithophanes.
 *
 * Defines which filaments are available and printing parameters that
 * affect colour prediction.
 */
export interface PrintConfig {
  /** Filaments loaded in the multi-material system */
  slots: AmsSlot[];
  /** Maximum colour layers per pixel column (default: 5) */
  maxLayers: number;
  /** Layer height in mm (affects TD model, default: 0.1) */
  layerHeight: number;
  /** The white/translucent base filament — always needed for luminosity */
  baseFilament: Filament;
}

/**
 * A single achievable colour from a specific layer combination.
 * Pre-computed by the combination engine.
 */
export interface AchievableColor {
  /** Unique key encoding the combination, e.g. "3W-1C-1M" */
  comboKey: string;
  /** Layer assignment: filament ID and layer count, bottom to top */
  layers: Array<{ filamentId: string; count: number }>;
  /** Predicted RGB colour after light passes through the stack */
  predictedRgb: RGB;
  /** Predicted CIELab colour for perceptual matching */
  predictedLab: Lab;
  /** Total thickness in mm */
  totalThickness: number;
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/** Generate a simple UUID v4 */
export function generateFilamentId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Create a Filament object with defaults */
export function createFilament(
  overrides: Partial<Filament> & Pick<Filament, 'name' | 'hexColor' | 'td'>
): Filament {
  return {
    id: generateFilamentId(),
    brand: 'Unknown',
    material: 'PLA',
    isCalibrated: false,
    ...overrides,
  };
}

/** Get the RGB colour of a filament */
export function filamentRgb(f: Filament): RGB {
  return hexToRgb(f.hexColor);
}

/** Get the Lab colour of a filament */
export function filamentLab(f: Filament): Lab {
  const [r, g, b] = hexToRgb(f.hexColor);
  return rgbToLab(r, g, b);
}

/** Create a default PrintConfig (4-slot AMS with CMYW) */
export function defaultPrintConfig(filaments: Filament[]): PrintConfig {
  const white = filaments.find(f =>
    f.name.toLowerCase().includes('white')
  ) ?? filaments[0];

  return {
    slots: filaments.slice(0, 4).map((f, i) => ({ slot: i + 1, filament: f })),
    maxLayers: 5,
    layerHeight: 0.1,
    baseFilament: white,
  };
}

/**
 * Validate a Filament object.
 * Returns null if valid, or an error message.
 */
export function validateFilament(f: Filament): string | null {
  if (!f.name || f.name.trim().length === 0) return 'Name is required';
  if (!/^#[0-9a-fA-F]{6}$/.test(f.hexColor)) return 'Invalid hex colour (expected #RRGGBB)';
  if (f.td <= 0 || f.td > 20) return 'TD must be between 0.01 and 20 mm';
  if (!f.id || f.id.length < 8) return 'Invalid filament ID';
  return null;
}

/**
 * Validate a PrintConfig.
 * Returns null if valid, or an error message.
 */
export function validatePrintConfig(config: PrintConfig): string | null {
  if (config.slots.length === 0) return 'At least one filament slot is required';
  if (config.maxLayers < 1 || config.maxLayers > 20) return 'Max layers must be 1–20';
  if (config.layerHeight <= 0 || config.layerHeight > 1) return 'Layer height must be 0.01–1.0 mm';

  const baseErr = validateFilament(config.baseFilament);
  if (baseErr) return `Base filament: ${baseErr}`;

  for (const slot of config.slots) {
    const err = validateFilament(slot.filament);
    if (err) return `Slot ${slot.slot}: ${err}`;
  }

  return null;
}

// ─── Import / Export ─────────────────────────────────────────────────────────

/** Serializable palette format (JSON-compatible) */
export interface FilamentLibraryJSON {
  version: 1;
  filaments: Filament[];
}

/** Export a filament library to JSON string */
export function exportFilamentLibrary(filaments: Filament[]): string {
  const lib: FilamentLibraryJSON = { version: 1, filaments };
  return JSON.stringify(lib, null, 2);
}

/** Import a filament library from JSON string. Returns filaments or throws. */
export function importFilamentLibrary(json: string): Filament[] {
  const parsed = JSON.parse(json);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.filaments)) {
    throw new Error('Invalid filament library format (expected version 1)');
  }
  const filaments = parsed.filaments as Filament[];
  for (const f of filaments) {
    const err = validateFilament(f);
    if (err) throw new Error(`Invalid filament "${f.name}": ${err}`);
  }
  return filaments;
}
