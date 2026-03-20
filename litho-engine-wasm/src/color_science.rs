/// Color Science Library — sRGB ↔ CIELab, CIEDE2000, Beer-Lambert TD Model
///
/// Pure functions for perceptual colour math. All sRGB inputs/outputs are [0,255].
///
/// References:
///  - sRGB ↔ XYZ:  IEC 61966-2-1
///  - XYZ  ↔ Lab:  CIE 15:2004
///  - CIEDE2000:   CIE 142-2001 (Sharma et al. 2005)
///  - Beer-Lambert: simplified exponential transmittance model

// ── Constants ────────────────────────────────────────────────────────────────

/// D65 reference white XYZ values (2° observer)
const D65_X: f64 = 95.047;
const D65_Y: f64 = 100.0;
const D65_Z: f64 = 108.883;

/// Lab f(t) threshold: (6/29)³ ≈ 0.008856
const LAB_E: f64 = 0.008856;
/// Lab f(t) coefficient: (29/6)² / 3 ≈ 7.787
const LAB_K: f64 = 7.787;

/// 25^7 used in CIEDE2000
const POW25_7: f64 = 6103515625.0;

const PI: f64 = std::f64::consts::PI;
const DEG2RAD: f64 = PI / 180.0;
const RAD2DEG: f64 = 180.0 / PI;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy)]
pub struct Lab {
    pub l: f64,
    pub a: f64,
    pub b: f64,
}

#[derive(Debug, Clone, Copy)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

// ── sRGB ↔ Linear ────────────────────────────────────────────────────────────

/// sRGB gamma → linear (inverse companding). Input: 0–1
#[inline(always)]
fn srgb_to_linear(c: f64) -> f64 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

/// Linear → sRGB gamma (companding). Input: 0–1
#[inline(always)]
fn linear_to_srgb(c: f64) -> f64 {
    if c <= 0.0031308 {
        c * 12.92
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

// ── RGB ↔ Lab (via XYZ D65) ──────────────────────────────────────────────────

/// Lab forward transform helper
#[inline(always)]
fn lab_f(t: f64) -> f64 {
    if t > LAB_E {
        t.cbrt()
    } else {
        LAB_K * t + 16.0 / 116.0
    }
}

/// sRGB [0–255] → CIELab (D65, 2° observer)
#[inline]
pub fn rgb_to_lab(r: u8, g: u8, b: u8) -> Lab {
    let rl = srgb_to_linear(r as f64 / 255.0);
    let gl = srgb_to_linear(g as f64 / 255.0);
    let bl = srgb_to_linear(b as f64 / 255.0);

    // sRGB → XYZ matrix (D65)
    let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100.0;
    let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) * 100.0;
    let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) * 100.0;

    let fx = lab_f(x / D65_X);
    let fy = lab_f(y / D65_Y);
    let fz = lab_f(z / D65_Z);

    Lab {
        l: 116.0 * fy - 16.0,
        a: 500.0 * (fx - fy),
        b: 200.0 * (fy - fz),
    }
}

/// CIELab → sRGB [0–255], clamped
#[inline]
pub fn lab_to_rgb(lab: &Lab) -> Rgb {
    let fy = (lab.l + 16.0) / 116.0;
    let fx = lab.a / 500.0 + fy;
    let fz = fy - lab.b / 200.0;

    let lab_f_inv = |t: f64| -> f64 {
        let t3 = t * t * t;
        if t3 > LAB_E { t3 } else { (t - 16.0 / 116.0) / LAB_K }
    };

    let x = lab_f_inv(fx) * D65_X / 100.0;
    let y = lab_f_inv(fy) * D65_Y / 100.0;
    let z = lab_f_inv(fz) * D65_Z / 100.0;

    // XYZ → linear sRGB matrix (D65)
    let rl = x *  3.2404542 + y * -1.5371385 + z * -0.4985314;
    let gl = x * -0.9692660 + y *  1.8760108 + z *  0.0415560;
    let bl = x *  0.0556434 + y * -0.2040259 + z *  1.0572252;

    let clamp = |v: f64| -> u8 {
        (linear_to_srgb(v) * 255.0).round().max(0.0).min(255.0) as u8
    };

    Rgb { r: clamp(rl), g: clamp(gl), b: clamp(bl) }
}

// ── CIEDE2000 ────────────────────────────────────────────────────────────────

/// CIEDE2000 Delta E — perceptually uniform colour distance.
///
/// Full implementation per Sharma, Wu, Dalal (2005).
/// kL = kC = kH = 1 (standard conditions).
#[inline]
pub fn delta_e_2000(lab1: &Lab, lab2: &Lab) -> f64 {
    let c1ab = (lab1.a * lab1.a + lab1.b * lab1.b).sqrt();
    let c2ab = (lab2.a * lab2.a + lab2.b * lab2.b).sqrt();
    let cab_mean = (c1ab + c2ab) / 2.0;

    let cab_mean7 = cab_mean.powi(7);
    let g = 0.5 * (1.0 - (cab_mean7 / (cab_mean7 + POW25_7)).sqrt());
    let a1p = lab1.a * (1.0 + g);
    let a2p = lab2.a * (1.0 + g);

    let c1p = (a1p * a1p + lab1.b * lab1.b).sqrt();
    let c2p = (a2p * a2p + lab2.b * lab2.b).sqrt();

    let mut h1p = lab1.b.atan2(a1p) * RAD2DEG;
    if h1p < 0.0 { h1p += 360.0; }
    let mut h2p = lab2.b.atan2(a2p) * RAD2DEG;
    if h2p < 0.0 { h2p += 360.0; }

    // Step 2: ΔL', ΔC', ΔH'
    let d_lp = lab2.l - lab1.l;
    let d_cp = c2p - c1p;

    let dhp = if c1p * c2p == 0.0 {
        0.0
    } else if (h2p - h1p).abs() <= 180.0 {
        h2p - h1p
    } else if h2p - h1p > 180.0 {
        h2p - h1p - 360.0
    } else {
        h2p - h1p + 360.0
    };
    let d_hp = 2.0 * (c1p * c2p).sqrt() * (dhp / 2.0 * DEG2RAD).sin();

    // Step 3: weighting functions
    let lpm = (lab1.l + lab2.l) / 2.0;
    let cpm = (c1p + c2p) / 2.0;

    let hpm = if c1p * c2p == 0.0 {
        h1p + h2p
    } else if (h1p - h2p).abs() <= 180.0 {
        (h1p + h2p) / 2.0
    } else if h1p + h2p < 360.0 {
        (h1p + h2p + 360.0) / 2.0
    } else {
        (h1p + h2p - 360.0) / 2.0
    };

    let t = 1.0
        - 0.17 * ((hpm - 30.0) * DEG2RAD).cos()
        + 0.24 * ((2.0 * hpm) * DEG2RAD).cos()
        + 0.32 * ((3.0 * hpm + 6.0) * DEG2RAD).cos()
        - 0.20 * ((4.0 * hpm - 63.0) * DEG2RAD).cos();

    let lpm50 = lpm - 50.0;
    let sl = 1.0 + (0.015 * lpm50 * lpm50) / (20.0 + lpm50 * lpm50).sqrt();
    let sc = 1.0 + 0.045 * cpm;
    let sh = 1.0 + 0.015 * cpm * t;

    let cpm7 = cpm.powi(7);
    let rt = -2.0 * (cpm7 / (cpm7 + POW25_7)).sqrt()
        * (60.0 * (-((hpm - 275.0) / 25.0).powi(2)).exp() * DEG2RAD).sin();

    let term_l = d_lp / sl;
    let term_c = d_cp / sc;
    let term_h = d_hp / sh;

    (term_l * term_l + term_c * term_c + term_h * term_h + rt * term_c * term_h).sqrt()
}

// ── Beer-Lambert Transmission ────────────────────────────────────────────────

/// Predict the perceived colour when backlight passes through a filament layer.
///
/// Uses Beer-Lambert: T = e^(-thickness / td)
/// perceived = background × T + filament × (1 - T)
#[inline]
pub fn predict_transmitted_color(
    filament: Rgb,
    td: f64,
    thickness: f64,
    back: Rgb,
) -> Rgb {
    if td <= 0.0 || thickness <= 0.0 {
        return back;
    }

    let f_lin = [
        srgb_to_linear(filament.r as f64 / 255.0),
        srgb_to_linear(filament.g as f64 / 255.0),
        srgb_to_linear(filament.b as f64 / 255.0),
    ];
    let b_lin = [
        srgb_to_linear(back.r as f64 / 255.0),
        srgb_to_linear(back.g as f64 / 255.0),
        srgb_to_linear(back.b as f64 / 255.0),
    ];

    let transmittance = (-thickness / td).exp();
    let opacity = 1.0 - transmittance;

    let clamp = |v: f64| -> u8 {
        (linear_to_srgb(v) * 255.0).round().max(0.0).min(255.0) as u8
    };

    Rgb {
        r: clamp(b_lin[0] * transmittance + f_lin[0] * opacity),
        g: clamp(b_lin[1] * transmittance + f_lin[1] * opacity),
        b: clamp(b_lin[2] * transmittance + f_lin[2] * opacity),
    }
}

/// Simulate light passing through a stack of filament layers (bottom to top).
pub fn predict_stack_color(
    layers: &[(Rgb, f64, f64)],  // (filamentRgb, td, thickness)
) -> Rgb {
    let mut current = Rgb { r: 255, g: 255, b: 255 }; // backlight

    for &(filament_rgb, td, thickness) in layers {
        current = predict_transmitted_color(filament_rgb, td, thickness, current);
    }

    current
}

// ── Hex parsing ──────────────────────────────────────────────────────────────

/// Parse "#RRGGBB" → Rgb
pub fn hex_to_rgb(hex: &str) -> Rgb {
    let hex = hex.trim_start_matches('#');
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
    Rgb { r, g, b }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn white_lab() {
        let lab = rgb_to_lab(255, 255, 255);
        assert!((lab.l - 100.0).abs() < 0.5);
        assert!(lab.a.abs() < 0.5);
        assert!(lab.b.abs() < 0.5);
    }

    #[test]
    fn black_lab() {
        let lab = rgb_to_lab(0, 0, 0);
        assert!(lab.l.abs() < 0.5);
    }

    #[test]
    fn lab_roundtrip() {
        let original = Rgb { r: 128, g: 64, b: 200 };
        let lab = rgb_to_lab(original.r, original.g, original.b);
        let back = lab_to_rgb(&lab);
        assert!((original.r as i16 - back.r as i16).abs() <= 1);
        assert!((original.g as i16 - back.g as i16).abs() <= 1);
        assert!((original.b as i16 - back.b as i16).abs() <= 1);
    }

    #[test]
    fn delta_e_identical() {
        let lab = rgb_to_lab(100, 150, 200);
        assert!(delta_e_2000(&lab, &lab) < 0.001);
    }

    #[test]
    fn delta_e_different() {
        let lab1 = rgb_to_lab(255, 0, 0);
        let lab2 = rgb_to_lab(0, 0, 255);
        assert!(delta_e_2000(&lab1, &lab2) > 30.0);
    }

    #[test]
    fn hex_parse() {
        let rgb = hex_to_rgb("#FF8000");
        assert_eq!(rgb.r, 255);
        assert_eq!(rgb.g, 128);
        assert_eq!(rgb.b, 0);
    }

    #[test]
    fn transmit_zero_thickness() {
        let result = predict_transmitted_color(
            Rgb { r: 255, g: 0, b: 0 },
            1.0, 0.0,
            Rgb { r: 255, g: 255, b: 255 },
        );
        assert_eq!(result.r, 255);
        assert_eq!(result.g, 255);
        assert_eq!(result.b, 255);
    }
}
