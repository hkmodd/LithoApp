/**
 * Color Science Library — CIELab, Delta E, Transmission Distance
 *
 * Pure functions for perceptual colour math used across the palette engine.
 * All sRGB inputs/outputs assume the [0, 255] integer range unless noted.
 *
 * References:
 *  - sRGB ↔ XYZ:  IEC 61966-2-1
 *  - XYZ  ↔ Lab:  CIE 15:2004
 *  - CIEDE2000:   CIE 142-2001 (Sharma et al. 2005)
 *  - Beer-Lambert: simplified exponential transmittance model
 */

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** D65 reference white XYZ values (2° observer) */
const D65_X = 95.047;
const D65_Y = 100.0;
const D65_Z = 108.883;

/** Lab f(t) threshold: (6/29)³ ≈ 0.008856 */
const LAB_E = 0.008856;
/** Lab f(t) coefficient: (29/6)² / 3 ≈ 7.787 */
const LAB_K = 7.787;

// ─── sRGB ↔ Linear ──────────────────────────────────────────────────────────

/** sRGB gamma → linear (inverse companding). Input: 0–1 */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear → sRGB gamma (companding). Input: 0–1 */
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// ─── RGB ↔ XYZ (D65) ────────────────────────────────────────────────────────

export type Lab = [L: number, a: number, b: number];
export type RGB = [r: number, g: number, b: number];
export type XYZ = [x: number, y: number, z: number];

/** sRGB [0–255] → CIE XYZ (D65, 2° observer) */
export function rgbToXyz(r: number, g: number, b: number): XYZ {
  const rl = srgbToLinear(r / 255);
  const gl = srgbToLinear(g / 255);
  const bl = srgbToLinear(b / 255);

  // sRGB → XYZ matrix (D65)
  return [
    (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100,
    (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) * 100,
    (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) * 100,
  ];
}

/** CIE XYZ → sRGB [0–255], clamped */
export function xyzToRgb(x: number, y: number, z: number): RGB {
  const xn = x / 100;
  const yn = y / 100;
  const zn = z / 100;

  // XYZ → linear sRGB matrix (D65)
  let rl =  xn *  3.2404542 + yn * -1.5371385 + zn * -0.4985314;
  let gl =  xn * -0.9692660 + yn *  1.8760108 + zn *  0.0415560;
  let bl =  xn *  0.0556434 + yn * -0.2040259 + zn *  1.0572252;

  // Apply gamma and clamp
  return [
    Math.round(Math.min(255, Math.max(0, linearToSrgb(rl) * 255))),
    Math.round(Math.min(255, Math.max(0, linearToSrgb(gl) * 255))),
    Math.round(Math.min(255, Math.max(0, linearToSrgb(bl) * 255))),
  ];
}

// ─── XYZ ↔ CIELab ───────────────────────────────────────────────────────────

/** Lab forward transform helper */
function labF(t: number): number {
  return t > LAB_E ? Math.cbrt(t) : LAB_K * t + 16 / 116;
}

/** Lab inverse transform helper */
function labFInv(t: number): number {
  const t3 = t * t * t;
  return t3 > LAB_E ? t3 : (t - 16 / 116) / LAB_K;
}

/** CIE XYZ → CIELab (D65 reference) */
export function xyzToLab(x: number, y: number, z: number): Lab {
  const fx = labF(x / D65_X);
  const fy = labF(y / D65_Y);
  const fz = labF(z / D65_Z);
  return [
    116 * fy - 16,
    500 * (fx - fy),
    200 * (fy - fz),
  ];
}

/** CIELab → CIE XYZ (D65 reference) */
export function labToXyz(L: number, a: number, b: number): XYZ {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  return [
    labFInv(fx) * D65_X,
    labFInv(fy) * D65_Y,
    labFInv(fz) * D65_Z,
  ];
}

// ─── RGB ↔ CIELab (convenience) ─────────────────────────────────────────────

/** sRGB [0–255] → CIELab */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/** CIELab → sRGB [0–255], clamped */
export function labToRgb(L: number, a: number, b: number): RGB {
  const [x, y, z] = labToXyz(L, a, b);
  return xyzToRgb(x, y, z);
}

// ─── Delta E (Colour Distance) ──────────────────────────────────────────────

/**
 * CIE76 Delta E — simple Euclidean distance in Lab space.
 * Fast but less accurate for saturated colours.
 */
export function deltaE76(lab1: Lab, lab2: Lab): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * CIEDE2000 Delta E — perceptually uniform colour distance.
 *
 * Implements the full CIEDE2000 formula (Sharma, Wu, Dalal 2005).
 * More expensive than CIE76 but far more accurate for:
 *  - Skin tones (critical for portrait lithophanes)
 *  - Green/blue hues (where CIE76 overestimates differences)
 *  - Near-neutral greys
 *
 * Parametric weights kL=kC=kH=1 (default, standard conditions).
 */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  // Step 1: Calculate Cab, hab
  const C1ab = Math.sqrt(a1 * a1 + b1 * b1);
  const C2ab = Math.sqrt(a2 * a2 + b2 * b2);
  const CabMean = (C1ab + C2ab) / 2;

  const CabMean7 = Math.pow(CabMean, 7);
  const G = 0.5 * (1 - Math.sqrt(CabMean7 / (CabMean7 + 6103515625))); // 25^7
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  if (h2p < 0) h2p += 360;

  // Step 2: Calculate ΔL', ΔC', ΔH'
  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * (Math.PI / 180));

  // Step 3: Calculate CIEDE2000 weighting functions
  const Lpm = (L1 + L2) / 2;
  const Cpm = (C1p + C2p) / 2;

  let Hpm: number;
  if (C1p * C2p === 0) {
    Hpm = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    Hpm = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    Hpm = (h1p + h2p + 360) / 2;
  } else {
    Hpm = (h1p + h2p - 360) / 2;
  }

  const T = 1
    - 0.17 * Math.cos((Hpm - 30) * (Math.PI / 180))
    + 0.24 * Math.cos((2 * Hpm) * (Math.PI / 180))
    + 0.32 * Math.cos((3 * Hpm + 6) * (Math.PI / 180))
    - 0.20 * Math.cos((4 * Hpm - 63) * (Math.PI / 180));

  const SL = 1 + (0.015 * (Lpm - 50) * (Lpm - 50)) / Math.sqrt(20 + (Lpm - 50) * (Lpm - 50));
  const SC = 1 + 0.045 * Cpm;
  const SH = 1 + 0.015 * Cpm * T;

  const Cpm7 = Math.pow(Cpm, 7);
  const RT = -2 * Math.sqrt(Cpm7 / (Cpm7 + 6103515625))
    * Math.sin(60 * Math.exp(-((Hpm - 275) / 25) * ((Hpm - 275) / 25)) * (Math.PI / 180));

  // kL = kC = kH = 1 (standard)
  const termL = dLp / SL;
  const termC = dCp / SC;
  const termH = dHp / SH;

  return Math.sqrt(
    termL * termL + termC * termC + termH * termH + RT * termC * termH
  );
}

// ─── HSL → CMYK ──────────────────────────────────────────────────────────────

export type CMYK = [c: number, m: number, y: number, k: number];

/** HSL [H: 0–360, S: 0–100, L: 0–100] → RGB [0–255] */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60)       { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else              { r1 = c; b1 = x; }
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

/** RGB [0–255] → CMYK [0–1], standard conversion with UCR */
export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return [0, 0, 0, 1];
  const inv = 1 / (1 - k);
  return [
    (1 - rn - k) * inv,
    (1 - gn - k) * inv,
    (1 - bn - k) * inv,
    k,
  ];
}

/** CMYK [0–1] → RGB [0–255] */
export function cmykToRgb(c: number, m: number, y: number, k: number): RGB {
  return [
    Math.round(255 * (1 - c) * (1 - k)),
    Math.round(255 * (1 - m) * (1 - k)),
    Math.round(255 * (1 - y) * (1 - k)),
  ];
}

// ─── Hex ↔ RGB ───────────────────────────────────────────────────────────────

/** Parse "#RRGGBB" → RGB [0–255] */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** RGB [0–255] → "#RRGGBB" */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Transmission Distance (Beer-Lambert) ────────────────────────────────────

/**
 * Predict the perceived colour when backlight passes through a filament layer.
 *
 * Uses a simplified Beer-Lambert exponential attenuation model:
 *   T = e^(-thickness / td)    — transmittance fraction
 *   perceived = background × T + filament × (1 - T)
 *
 * At thickness=0  → 100% background (transparent)
 * At thickness=∞  → 100% filament colour (opaque)
 * At thickness=td → ~63% filament, 37% background
 *
 * @param filamentRgb  RGB colour of the filament [0–255]
 * @param td           Transmission Distance in mm (higher = more translucent)
 * @param thickness    Actual thickness of the filament layer in mm
 * @param backRgb      RGB colour of the light source / underlying layer [0–255]
 * @returns            Predicted apparent RGB [0–255]
 */
export function predictTransmittedColor(
  filamentRgb: RGB,
  td: number,
  thickness: number,
  backRgb: RGB = [255, 255, 255]
): RGB {
  if (td <= 0 || thickness <= 0) return backRgb;

  // Work in linear space for physically correct blending
  const fLin = filamentRgb.map(c => srgbToLinear(c / 255));
  const bLin = backRgb.map(c => srgbToLinear(c / 255));

  const transmittance = Math.exp(-thickness / td);
  const opacity = 1 - transmittance;

  return [
    Math.round(Math.min(255, Math.max(0, linearToSrgb(bLin[0] * transmittance + fLin[0] * opacity) * 255))),
    Math.round(Math.min(255, Math.max(0, linearToSrgb(bLin[1] * transmittance + fLin[1] * opacity) * 255))),
    Math.round(Math.min(255, Math.max(0, linearToSrgb(bLin[2] * transmittance + fLin[2] * opacity) * 255))),
  ];
}

/**
 * Simulate light passing through a stack of filament layers (bottom to top).
 *
 * Starts with white backlight (255, 255, 255) and applies Beer-Lambert
 * attenuation for each layer in sequence. This models real lithophane
 * physics: light enters from behind and passes through each coloured
 * layer, losing energy according to each filament's TD and thickness.
 *
 * @param layers  Ordered stack from bottom (light source side) to top
 * @returns       Predicted apparent RGB [0–255] as seen from the front
 */
export function predictStackColor(
  layers: Array<{ filamentRgb: RGB; td: number; thickness: number }>
): RGB {
  let current: RGB = [255, 255, 255]; // backlight

  for (const layer of layers) {
    current = predictTransmittedColor(layer.filamentRgb, layer.td, layer.thickness, current);
  }

  return current;
}
