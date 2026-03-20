/**
 * Combination Engine — Exhaustive achievable colour palette builder
 *
 * Given a set of filaments (AMS slots) and a maximum layer count,
 * generates every possible layer combination and predicts the
 * resulting colour using the Beer-Lambert TD model.
 *
 * Algorithm (inspired by PIXEstL combinatorial approach):
 *   1. Enumerate all integer partitions of (0..maxLayers) across N filaments
 *   2. For each partition, simulate light through the layer stack
 *   3. Store predicted RGB + Lab for each unique combination
 *   4. Deduplicate combos where ΔE < threshold
 */

import {
  type RGB, type Lab,
  rgbToLab, predictStackColor, deltaE2000,
} from '../utils/colorScience';
import {
  type PrintConfig, type AchievableColor, type Filament,
} from '../models/filamentPalette';
import { hexToRgb } from '../utils/colorScience';

// ─── Combination Generation ──────────────────────────────────────────────────

/**
 * Represents a layer partition: how many layers of each filament.
 * Index corresponds to slot index in PrintConfig.slots.
 */
type LayerPartition = number[];

/**
 * Generate all partitions of `total` layers across `slotCount` filaments.
 * Each partition is an array of length slotCount where sum(partition) = total.
 *
 * Include the base filament implicitly: remaining layers are filled with base.
 */
function generatePartitions(total: number, slotCount: number): LayerPartition[] {
  const results: LayerPartition[] = [];

  function recurse(remaining: number, slotIdx: number, current: number[]) {
    if (slotIdx === slotCount - 1) {
      // Last slot gets whatever is remaining
      results.push([...current, remaining]);
      return;
    }
    for (let i = 0; i <= remaining; i++) {
      current.push(i);
      recurse(remaining - i, slotIdx + 1, current);
      current.pop();
    }
  }

  recurse(total, 0, []);
  return results;
}

/**
 * Generate all partitions for layer counts from 0 to maxLayers.
 * This captures different total thickness levels too.
 */
function generateAllPartitions(maxLayers: number, slotCount: number): LayerPartition[] {
  const all: LayerPartition[] = [];
  for (let totalLayers = 0; totalLayers <= maxLayers; totalLayers++) {
    all.push(...generatePartitions(totalLayers, slotCount));
  }
  return all;
}

// ─── Colour Prediction ──────────────────────────────────────────────────────

/**
 * Predict the resulting colour for a given layer partition.
 *
 * The stack is built bottom-to-top:
 *   1. Base filament layers fill (maxLayers - sum(partition)) at the bottom
 *   2. Colour filament layers are stacked on top, in slot order
 *
 * Light enters from behind and passes through each layer.
 */
function predictPartitionColor(
  partition: LayerPartition,
  config: PrintConfig,
): RGB {
  const totalColorLayers = partition.reduce((a, b) => a + b, 0);
  const baseLayers = config.maxLayers - totalColorLayers;

  const baseRgb = hexToRgb(config.baseFilament.hexColor);
  const baseTd = config.baseFilament.td;

  // Build layer stack
  const layers: Array<{ filamentRgb: RGB; td: number; thickness: number }> = [];

  // Base layers at the bottom
  if (baseLayers > 0) {
    layers.push({
      filamentRgb: baseRgb,
      td: baseTd,
      thickness: baseLayers * config.layerHeight,
    });
  }

  // Colour layers on top, in slot order
  for (let i = 0; i < partition.length; i++) {
    if (partition[i] > 0) {
      const filament = config.slots[i].filament;
      layers.push({
        filamentRgb: hexToRgb(filament.hexColor),
        td: filament.td,
        thickness: partition[i] * config.layerHeight,
      });
    }
  }

  return predictStackColor(layers);
}

/**
 * Build a human-readable combo key from a partition.
 * Example: [3, 1, 1] with slots [White, Cyan, Magenta] → "3W-1C-1M"
 */
function buildComboKey(partition: LayerPartition, config: PrintConfig): string {
  const parts: string[] = [];
  const totalColor = partition.reduce((a, b) => a + b, 0);
  const baseLayers = config.maxLayers - totalColor;

  if (baseLayers > 0) {
    const baseInitial = config.baseFilament.name.charAt(0).toUpperCase();
    parts.push(`${baseLayers}${baseInitial}`);
  }

  for (let i = 0; i < partition.length; i++) {
    if (partition[i] > 0) {
      const initial = config.slots[i].filament.name.charAt(0).toUpperCase();
      parts.push(`${partition[i]}${initial}`);
    }
  }

  return parts.join('-') || '0';
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the complete achievable colour palette for a print configuration.
 *
 * @param config  Print configuration with filament slots and parameters
 * @param dedupeThreshold  Minimum ΔE2000 between palette entries (default: 1.0)
 * @returns  Array of achievable colours, sorted by lightness (L*)
 */
export function buildAchievablePalette(
  config: PrintConfig,
  dedupeThreshold = 1.0,
): AchievableColor[] {
  const slotCount = config.slots.length;
  const partitions = generateAllPartitions(config.maxLayers, slotCount);

  // Predict colour for each partition
  const candidates: AchievableColor[] = partitions.map(partition => {
    const rgb = predictPartitionColor(partition, config);
    const lab = rgbToLab(...rgb);
    const totalColor = partition.reduce((a, b) => a + b, 0);

    return {
      comboKey: buildComboKey(partition, config),
      layers: partition
        .map((count, i) => ({
          filamentId: config.slots[i].filament.id,
          count,
        }))
        .filter(l => l.count > 0),
      predictedRgb: rgb,
      predictedLab: lab,
      totalThickness: config.maxLayers * config.layerHeight,
    };
  });

  // Deduplicate: keep only entries where ΔE ≥ threshold from all kept entries
  const palette: AchievableColor[] = [];
  for (const candidate of candidates) {
    const isDuplicate = palette.some(
      existing => deltaE2000(existing.predictedLab, candidate.predictedLab) < dedupeThreshold
    );
    if (!isDuplicate) {
      palette.push(candidate);
    }
  }

  // Sort by lightness (L*) — brightest first
  palette.sort((a, b) => b.predictedLab[0] - a.predictedLab[0]);

  return palette;
}

/**
 * Get statistics about a palette.
 */
export interface PaletteStats {
  /** Total achievable colours (after dedup) */
  totalColors: number;
  /** Lightness range [min, max] */
  lightnessRange: [number, number];
  /** Maximum chroma achievable */
  maxChroma: number;
  /** Combo count before deduplication */
  rawCombinations: number;
}

export function getPaletteStats(
  palette: AchievableColor[],
  config: PrintConfig,
): PaletteStats {
  const rawCount = (() => {
    let count = 0;
    for (let n = 0; n <= config.maxLayers; n++) {
      // Stars and bars: C(n + k - 1, k - 1) where k = slots
      const k = config.slots.length;
      let c = 1;
      for (let i = 0; i < k - 1; i++) {
        c = (c * (n + k - 1 - i)) / (i + 1);
      }
      count += Math.round(c);
    }
    return count;
  })();

  let minL = Infinity, maxL = -Infinity, maxC = 0;
  for (const entry of palette) {
    const [L, a, b] = entry.predictedLab;
    if (L < minL) minL = L;
    if (L > maxL) maxL = L;
    const chroma = Math.sqrt(a * a + b * b);
    if (chroma > maxC) maxC = chroma;
  }

  return {
    totalColors: palette.length,
    lightnessRange: [minL, maxL],
    maxChroma: maxC,
    rawCombinations: rawCount,
  };
}

// Re-export for convenience
export { generatePartitions as _generatePartitions }; // for testing
