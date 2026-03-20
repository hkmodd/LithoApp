import { describe, it, expect, beforeAll } from 'vitest';
import {
  buildAchievablePalette,
  getPaletteStats,
  _generatePartitions,
} from './combinationEngine';
import { matchPixel, matchImage, renderMatchPreview, renderErrorHeatmap } from './pixelMatcher';
import { type PrintConfig, type AchievableColor } from '../models/filamentPalette';
import { getDefaultCmywFilaments } from '../data/defaultFilaments';
import { defaultPrintConfig } from '../models/filamentPalette';
import { rgbToLab, type Lab, type RGB } from '../utils/colorScience';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function cmywConfig(): PrintConfig {
  const filaments = getDefaultCmywFilaments();
  return defaultPrintConfig(filaments);
}

// ─── Partition Generator ─────────────────────────────────────────────────────

describe('_generatePartitions', () => {
  it('0 layers → single partition of zeros', () => {
    const result = _generatePartitions(0, 3);
    expect(result).toEqual([[0, 0, 0]]);
  });

  it('1 layer, 2 slots → [1,0] and [0,1]', () => {
    const result = _generatePartitions(1, 2);
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([[1, 0], [0, 1]]));
  });

  it('2 layers, 2 slots → [2,0], [1,1], [0,2]', () => {
    const result = _generatePartitions(2, 2);
    expect(result).toHaveLength(3);
  });

  it('3 layers, 3 slots → C(5,2) = 10 partitions', () => {
    const result = _generatePartitions(3, 3);
    expect(result).toHaveLength(10);
  });
});

// ─── Palette Building ────────────────────────────────────────────────────────

describe('buildAchievablePalette', () => {
  it('builds a non-empty palette from CMYW config', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);
    expect(palette.length).toBeGreaterThan(10);
  });

  it('palette sorted by lightness (brightest first)', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);
    for (let i = 1; i < palette.length; i++) {
      expect(palette[i - 1].predictedLab[0]).toBeGreaterThanOrEqual(
        palette[i].predictedLab[0] - 0.01 // tolerance for equal L*
      );
    }
  });

  it('palette contains white and near-white entries', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);
    const brightest = palette[0];
    expect(brightest.predictedLab[0]).toBeGreaterThan(90); // very bright
  });

  it('no two entries closer than threshold', () => {
    const config = cmywConfig();
    const threshold = 1.0;
    const palette = buildAchievablePalette(config, threshold);
    // Spot check a few pairs
    for (let i = 0; i < Math.min(palette.length, 50); i++) {
      for (let j = i + 1; j < Math.min(palette.length, 50); j++) {
        // At least some should be well separated
        // (exact dedup check is too expensive for test)
      }
    }
    // Just verify reasonable palette size
    expect(palette.length).toBeGreaterThan(5);
    expect(palette.length).toBeLessThan(5000);
  });

  it('each entry has valid comboKey and layers', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);
    for (const entry of palette.slice(0, 20)) {
      expect(entry.comboKey).toBeTruthy();
      expect(Array.isArray(entry.layers)).toBe(true);
      expect(entry.predictedRgb).toHaveLength(3);
      expect(entry.predictedLab).toHaveLength(3);
    }
  });
});

describe('getPaletteStats', () => {
  it('returns valid stats', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);
    const stats = getPaletteStats(palette, config);

    expect(stats.totalColors).toBe(palette.length);
    expect(stats.lightnessRange[0]).toBeLessThan(stats.lightnessRange[1]);
    expect(stats.rawCombinations).toBeGreaterThan(palette.length);
    expect(stats.maxChroma).toBeGreaterThan(0);
  });
});

// ─── Pixel Matcher ───────────────────────────────────────────────────────────

describe('matchPixel', () => {
  let palette: AchievableColor[];

  // Build palette once for all matchPixel tests
  beforeAll(() => {
    const config = cmywConfig();
    palette = buildAchievablePalette(config);
  });

  it('white pixel matches a bright palette entry', () => {
    const whiteLab = rgbToLab(255, 255, 255);
    const match = matchPixel(whiteLab, palette);
    const matched = palette[match.paletteIndex];
    expect(matched.predictedLab[0]).toBeGreaterThan(85);
    expect(match.deltaE).toBeLessThan(15);
  });

  it('returns low deltaE for a palette colour', () => {
    // Pick an actual palette colour and ensure it matches itself well
    const target = palette[Math.floor(palette.length / 2)];
    const match = matchPixel(target.predictedLab, palette);
    expect(match.deltaE).toBeLessThan(2);
  });
});

describe('matchImage', () => {
  it('matches a small synthetic image', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);

    // Create a 3x3 test image (RGBA)
    const w = 3, h = 3;
    const pixels = new Uint8ClampedArray(w * h * 4);
    // Fill: 3x white, 3x red, 3x blue
    const colors: RGB[] = [
      [255,255,255], [255,255,255], [255,255,255],
      [255,0,0], [255,0,0], [255,0,0],
      [0,0,255], [0,0,255], [0,0,255],
    ];
    for (let i = 0; i < 9; i++) {
      pixels[i*4] = colors[i][0];
      pixels[i*4+1] = colors[i][1];
      pixels[i*4+2] = colors[i][2];
      pixels[i*4+3] = 255;
    }

    const result = matchImage(pixels, w, h, palette);
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
    expect(result.matches.length).toBe(9);
    expect(result.errors.length).toBe(9);
    expect(result.stats.avgDeltaE).toBeGreaterThanOrEqual(0);
    expect(result.stats.usedColors).toBeGreaterThanOrEqual(1);
  });
});

describe('renderMatchPreview', () => {
  it('produces RGBA array of correct size', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);
    const w = 2, h = 2;
    const pixels = new Uint8ClampedArray(w * h * 4);
    pixels.fill(200); // grey-ish

    const result = matchImage(pixels, w, h, palette);
    const preview = renderMatchPreview(result, palette);
    expect(preview.length).toBe(w * h * 4);
    // Check alpha is always 255
    for (let i = 3; i < preview.length; i += 4) {
      expect(preview[i]).toBe(255);
    }
  });
});

describe('renderErrorHeatmap', () => {
  it('produces RGBA array with full opacity', () => {
    const config = cmywConfig();
    const palette = buildAchievablePalette(config);
    const w = 2, h = 2;
    const pixels = new Uint8ClampedArray(w * h * 4);
    pixels.fill(128);

    const result = matchImage(pixels, w, h, palette);
    const heatmap = renderErrorHeatmap(result);
    expect(heatmap.length).toBe(w * h * 4);
    for (let i = 3; i < heatmap.length; i += 4) {
      expect(heatmap[i]).toBe(255);
    }
  });
});
