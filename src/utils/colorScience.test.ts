import { describe, it, expect } from 'vitest';
import {
  rgbToLab, labToRgb,
  rgbToXyz, xyzToRgb,
  xyzToLab, labToXyz,
  deltaE76, deltaE2000,
  hslToRgb, rgbToCmyk, cmykToRgb,
  hexToRgb, rgbToHex,
  predictTransmittedColor, predictStackColor,
  type Lab, type RGB,
} from './colorScience';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Check RGB values within tolerance (rounding) */
function expectRgbClose(actual: RGB, expected: RGB, tolerance = 2) {
  expect(actual[0]).toBeGreaterThanOrEqual(expected[0] - tolerance);
  expect(actual[0]).toBeLessThanOrEqual(expected[0] + tolerance);
  expect(actual[1]).toBeGreaterThanOrEqual(expected[1] - tolerance);
  expect(actual[1]).toBeLessThanOrEqual(expected[1] + tolerance);
  expect(actual[2]).toBeGreaterThanOrEqual(expected[2] - tolerance);
  expect(actual[2]).toBeLessThanOrEqual(expected[2] + tolerance);
}

/** Check Lab values within tolerance */
function expectLabClose(actual: Lab, expected: Lab, tolerance = 0.5) {
  expect(actual[0]).toBeCloseTo(expected[0], 0);
  expect(actual[1]).toBeCloseTo(expected[1], 0);
  expect(actual[2]).toBeCloseTo(expected[2], 0);
}

// ─── RGB ↔ Lab Round-Trip ────────────────────────────────────────────────────

describe('RGB ↔ Lab round-trip', () => {
  const testCases: Array<{ name: string; rgb: RGB; labApprox: Lab }> = [
    { name: 'white',   rgb: [255, 255, 255], labApprox: [100, 0, 0] },
    { name: 'black',   rgb: [0, 0, 0],       labApprox: [0, 0, 0] },
    { name: 'red',     rgb: [255, 0, 0],     labApprox: [53.2, 80.1, 67.2] },
    { name: 'green',   rgb: [0, 128, 0],     labApprox: [46.2, -51.7, 49.9] },
    { name: 'blue',    rgb: [0, 0, 255],     labApprox: [32.3, 79.2, -107.9] },
    { name: 'mid grey', rgb: [128, 128, 128], labApprox: [53.6, 0, 0] },
  ];

  for (const { name, rgb, labApprox } of testCases) {
    it(`${name}: RGB → Lab produces expected values`, () => {
      const lab = rgbToLab(...rgb);
      expectLabClose(lab, labApprox);
    });

    it(`${name}: RGB → Lab → RGB round-trip`, () => {
      const lab = rgbToLab(...rgb);
      const back = labToRgb(...lab);
      expectRgbClose(back, rgb);
    });
  }
});

// ─── XYZ ↔ Lab Round-Trip ────────────────────────────────────────────────────

describe('XYZ ↔ Lab round-trip', () => {
  it('D65 white point → Lab (100, 0, 0)', () => {
    const lab = xyzToLab(95.047, 100.0, 108.883);
    expect(lab[0]).toBeCloseTo(100, 1);
    expect(lab[1]).toBeCloseTo(0, 1);
    expect(lab[2]).toBeCloseTo(0, 1);
  });

  it('XYZ → Lab → XYZ round-trip', () => {
    const xyz = rgbToXyz(200, 100, 50);
    const lab = xyzToLab(...xyz);
    const back = labToXyz(...lab);
    expect(back[0]).toBeCloseTo(xyz[0], 3);
    expect(back[1]).toBeCloseTo(xyz[1], 3);
    expect(back[2]).toBeCloseTo(xyz[2], 3);
  });
});

// ─── Delta E ─────────────────────────────────────────────────────────────────

describe('Delta E76', () => {
  it('identical colours → 0', () => {
    const lab: Lab = [50, 20, -30];
    expect(deltaE76(lab, lab)).toBe(0);
  });

  it('white vs black → ~100', () => {
    const white = rgbToLab(255, 255, 255);
    const black = rgbToLab(0, 0, 0);
    expect(deltaE76(white, black)).toBeCloseTo(100, 0);
  });

  it('red vs green → large distance (>80)', () => {
    const red = rgbToLab(255, 0, 0);
    const green = rgbToLab(0, 255, 0);
    expect(deltaE76(red, green)).toBeGreaterThan(80);
  });

  it('similar greys → small distance (<5)', () => {
    const g1 = rgbToLab(120, 120, 120);
    const g2 = rgbToLab(125, 125, 125);
    expect(deltaE76(g1, g2)).toBeLessThan(5);
  });
});

describe('CIEDE2000', () => {
  it('identical colours → 0', () => {
    const lab: Lab = [50, 20, -30];
    expect(deltaE2000(lab, lab)).toBe(0);
  });

  it('white vs black → ~100', () => {
    const white = rgbToLab(255, 255, 255);
    const black = rgbToLab(0, 0, 0);
    const de = deltaE2000(white, black);
    expect(de).toBeGreaterThan(90);
    expect(de).toBeLessThan(110);
  });

  it('near-neutral subtle difference', () => {
    // Grey tones — CIEDE2000 should handle well
    const g1 = rgbToLab(128, 128, 128);
    const g2 = rgbToLab(130, 130, 130);
    const de = deltaE2000(g1, g2);
    expect(de).toBeGreaterThan(0);
    expect(de).toBeLessThan(3);
  });

  // Known CIEDE2000 test pair from Sharma et al. 2005 Table 1
  // Pair 1: (50.0000, 2.6772, -79.7751) vs (50.0000, 0.0000, -82.7485) → ΔE = 2.0425
  it('Sharma test pair 1', () => {
    const lab1: Lab = [50.0, 2.6772, -79.7751];
    const lab2: Lab = [50.0, 0.0, -82.7485];
    expect(deltaE2000(lab1, lab2)).toBeCloseTo(2.0425, 1);
  });
});

// ─── HSL → RGB ───────────────────────────────────────────────────────────────

describe('hslToRgb', () => {
  it('pure red', () => {
    expectRgbClose(hslToRgb(0, 100, 50), [255, 0, 0]);
  });

  it('pure green', () => {
    expectRgbClose(hslToRgb(120, 100, 50), [0, 255, 0]);
  });

  it('pure blue', () => {
    expectRgbClose(hslToRgb(240, 100, 50), [0, 0, 255]);
  });

  it('white', () => {
    expectRgbClose(hslToRgb(0, 0, 100), [255, 255, 255]);
  });

  it('black', () => {
    expectRgbClose(hslToRgb(0, 0, 0), [0, 0, 0]);
  });
});

// ─── CMYK Round-Trip ─────────────────────────────────────────────────────────

describe('CMYK round-trip', () => {
  const colors: Array<{ name: string; rgb: RGB }> = [
    { name: 'red',    rgb: [255, 0, 0] },
    { name: 'green',  rgb: [0, 255, 0] },
    { name: 'blue',   rgb: [0, 0, 255] },
    { name: 'yellow', rgb: [255, 255, 0] },
    { name: 'cyan',   rgb: [0, 255, 255] },
    { name: 'white',  rgb: [255, 255, 255] },
  ];

  for (const { name, rgb } of colors) {
    it(`${name}: RGB → CMYK → RGB`, () => {
      const cmyk = rgbToCmyk(...rgb);
      const back = cmykToRgb(...cmyk);
      expectRgbClose(back, rgb);
    });
  }

  it('black gives K=1', () => {
    const cmyk = rgbToCmyk(0, 0, 0);
    expect(cmyk[3]).toBe(1);
  });
});

// ─── Hex ─────────────────────────────────────────────────────────────────────

describe('Hex conversions', () => {
  it('parse hex', () => {
    expect(hexToRgb('#FF8000')).toEqual([255, 128, 0]);
  });

  it('format hex', () => {
    expect(rgbToHex(255, 128, 0)).toBe('#ff8000');
  });

  it('round-trip', () => {
    const hex = '#1a2b3c';
    expect(rgbToHex(...hexToRgb(hex))).toBe(hex);
  });
});

// ─── Transmission Distance (Beer-Lambert) ────────────────────────────────────

describe('predictTransmittedColor', () => {
  const cyanFilament: RGB = [0, 180, 220];

  it('thickness=0 → 100% back colour', () => {
    const result = predictTransmittedColor(cyanFilament, 2.0, 0);
    expectRgbClose(result, [255, 255, 255]);
  });

  it('very large thickness → ~filament colour', () => {
    const result = predictTransmittedColor(cyanFilament, 2.0, 100);
    expectRgbClose(result, cyanFilament, 5);
  });

  it('td=0 → returns background', () => {
    const result = predictTransmittedColor(cyanFilament, 0, 1.0);
    expectRgbClose(result, [255, 255, 255]);
  });

  it('thickness=td → ~63% filament, 37% background', () => {
    // At thickness=td, transmittance = 1/e ≈ 0.368
    // So we get roughly 63% filament + 37% backlight
    const result = predictTransmittedColor(cyanFilament, 2.0, 2.0);
    // Should be between white and filament, closer to filament
    expect(result[0]).toBeLessThan(200); // red drops toward 0
    expect(result[1]).toBeGreaterThan(150); // green stays high
    expect(result[2]).toBeGreaterThan(180); // blue stays high
  });
});

describe('predictStackColor', () => {
  it('empty stack → white', () => {
    const result = predictStackColor([]);
    expectRgbClose(result, [255, 255, 255]);
  });

  it('single layer = same as predictTransmittedColor', () => {
    const filament: RGB = [200, 50, 50];
    const td = 1.5;
    const thickness = 0.5;
    const single = predictTransmittedColor(filament, td, thickness);
    const stack = predictStackColor([{ filamentRgb: filament, td, thickness }]);
    expectRgbClose(stack, single);
  });

  it('stacking cyan + yellow → greenish', () => {
    const cyan: RGB = [0, 200, 230];
    const yellow: RGB = [240, 230, 0];
    const result = predictStackColor([
      { filamentRgb: cyan, td: 2.0, thickness: 1.0 },
      { filamentRgb: yellow, td: 2.0, thickness: 1.0 },
    ]);
    // Cyan absorbs red, yellow absorbs blue → remaining is green-ish
    expect(result[1]).toBeGreaterThan(result[0]); // green > red
    expect(result[1]).toBeGreaterThan(result[2]); // green > blue
  });

  it('more layers → darker', () => {
    const filament: RGB = [100, 100, 100];
    const one = predictStackColor([
      { filamentRgb: filament, td: 2.0, thickness: 1.0 },
    ]);
    const three = predictStackColor([
      { filamentRgb: filament, td: 2.0, thickness: 1.0 },
      { filamentRgb: filament, td: 2.0, thickness: 1.0 },
      { filamentRgb: filament, td: 2.0, thickness: 1.0 },
    ]);
    // More grey layers = darker
    const lum1 = (one[0] + one[1] + one[2]) / 3;
    const lum3 = (three[0] + three[1] + three[2]) / 3;
    expect(lum3).toBeLessThan(lum1);
  });
});
