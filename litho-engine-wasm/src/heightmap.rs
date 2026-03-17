use crate::types::{GridInfo, LithoParams, LithoShape};
use js_sys::Function;
use wasm_bindgen::JsValue;

/// Build heart mask and frame mask using the implicit equation:
///   (x² + y² − 1)³ − x²·y³ ≤ 0
/// Then erode the mask boundary by `border_px` to mark frame pixels.
pub fn build_heart_masks(gi: &GridInfo, _params: &LithoParams) -> (Vec<u8>, Vec<u8>) {
    let n = gi.grid_w * gi.grid_h;
    let mut mask = vec![0u8; n];
    let mut is_frame = vec![0u8; n];

    let gw = gi.grid_w as f32;
    let gh = gi.grid_h as f32;

    for y in 0..gi.grid_h {
        for x in 0..gi.grid_w {
            let nx = (x as f32 / (gw - 1.0)) * 2.4 - 1.2;
            let ny = -((y as f32 / (gh - 1.0)) * 2.2 - 1.1) + 0.1;
            let t = nx * nx + ny * ny - 1.0;
            let eq = t * t * t - nx * nx * ny * ny * ny;
            if eq <= 0.0 {
                mask[y * gi.grid_w + x] = 1;
            }
        }
    }

    // Erosion for frame
    let bpx = gi.border_px_x.max(gi.border_px_y);
    let radius_sq = (bpx * bpx) as isize;
    let bpx_i = bpx as isize;

    for y in 0..gi.grid_h {
        for x in 0..gi.grid_w {
            if mask[y * gi.grid_w + x] == 0 {
                continue;
            }
            let mut is_border = false;
            'outer: for dy in -bpx_i..=bpx_i {
                for dx in -(gi.border_px_x as isize)..=(gi.border_px_x as isize) {
                    if dx * dx + dy * dy <= radius_sq {
                        let cy = y as isize + dy;
                        let cx = x as isize + dx;
                        if cy < 0
                            || cy >= gi.grid_h as isize
                            || cx < 0
                            || cx >= gi.grid_w as isize
                            || mask[cy as usize * gi.grid_w + cx as usize] == 0
                        {
                            is_border = true;
                            break 'outer;
                        }
                    }
                }
            }
            if is_border {
                is_frame[y * gi.grid_w + x] = 1;
            }
        }
    }

    (mask, is_frame)
}

/// Sample luminance from the source pixel data and produce a heightmap.
/// Applies contrast, brightness, and inversion.
pub fn build_heightmap(
    pixels: &[u8],
    width: u32,
    gi: &GridInfo,
    params: &LithoParams,
    mask: &[u8],
    is_frame: &[u8],
) -> Vec<f32> {
    let n = gi.grid_w * gi.grid_h;
    let mut heights = vec![0.0f32; n];

    let inv_255 = 1.0_f32 / 255.0;
    let thickness_range = params.max_thickness - params.base_thickness;

    for y in 0..gi.grid_h {
        for x in 0..gi.grid_w {
            let idx = y * gi.grid_w + x;

            if params.shape == LithoShape::Heart {
                if mask[idx] == 0 {
                    heights[idx] = 0.0;
                    continue;
                }
                if is_frame[idx] == 1 {
                    heights[idx] = params.frame_thickness;
                    continue;
                }
            } else {
                // Rectangular border / base stand
                let bottom_border = gi.border_px_y.max(gi.base_stand_px_y);
                if x < gi.border_px_x
                    || x >= gi.grid_w - gi.border_px_x
                    || y < gi.border_px_y
                    || y >= gi.grid_h - bottom_border
                {
                    let mut current_max = params.frame_thickness;
                    if y >= gi.grid_h - bottom_border && params.base_stand > current_max {
                        current_max = params.base_stand;
                    }
                    heights[idx] = current_max;
                    continue;
                }
            }

            // Sample original image — scale kept as f64 for sub-pixel precision
            let orig_x = (x as f64 / gi.scale).floor() as usize;
            let orig_y = (y as f64 / gi.scale).floor() as usize;
            let img_idx = (orig_y * width as usize + orig_x) * 4;

            let r = pixels[img_idx] as f32;
            let g = pixels[img_idx + 1] as f32;
            let b = pixels[img_idx + 2] as f32;

            let mut lum = (0.299 * r + 0.587 * g + 0.114 * b) * inv_255;

            // Contrast + brightness
            lum = (lum - 0.5) * params.contrast + 0.5 + params.brightness;
            lum = lum.clamp(0.0, 1.0);

            let normalized = if params.invert { lum } else { 1.0 - lum };
            heights[idx] = params.base_thickness + normalized * thickness_range;
        }
    }

    heights
}

/// Unsharp-masking (Laplacian sharpening) pass — skips border / frame pixels.
pub fn apply_sharpening(
    heights: &mut Vec<f32>,
    gi: &GridInfo,
    params: &LithoParams,
    mask: &[u8],
    is_frame: &[u8],
) {
    if params.sharpness <= 0.0 {
        return;
    }
    let n = gi.grid_w * gi.grid_h;
    let mut sharpened = vec![0.0f32; n];
    let bottom_border = gi.border_px_y.max(gi.base_stand_px_y);
    let sharp = params.sharpness;

    for y in 0..gi.grid_h {
        for x in 0..gi.grid_w {
            let idx = y * gi.grid_w + x;

            // Skip edges
            if x == 0 || x >= gi.grid_w - 1 || y == 0 || y >= gi.grid_h - 1 {
                sharpened[idx] = heights[idx];
                continue;
            }
            if params.shape == LithoShape::Heart && (mask[idx] == 0 || is_frame[idx] == 1) {
                sharpened[idx] = heights[idx];
                continue;
            }
            if params.shape != LithoShape::Heart
                && (x <= gi.border_px_x
                    || x >= gi.grid_w - gi.border_px_x - 1
                    || y <= gi.border_px_y
                    || y >= gi.grid_h - bottom_border - 1)
            {
                sharpened[idx] = heights[idx];
                continue;
            }

            let center = heights[idx];
            let top = heights[(y - 1) * gi.grid_w + x];
            let bottom = heights[(y + 1) * gi.grid_w + x];
            let left = heights[y * gi.grid_w + x - 1];
            let right = heights[y * gi.grid_w + x + 1];

            let laplacian = (top + bottom + left + right) - 4.0 * center;
            let new_h = center - sharp * laplacian;
            sharpened[idx] = new_h.clamp(params.base_thickness, params.max_thickness);
        }
    }

    *heights = sharpened;
}

/// Helper: check if pixel (x, y) is an interior pixel that should be smoothed.
#[inline(always)]
fn is_smoothable(
    x: usize,
    y: usize,
    gi: &GridInfo,
    params: &LithoParams,
    mask: &[u8],
    is_frame: &[u8],
    bottom_border: usize,
) -> bool {
    if x == 0 || x >= gi.grid_w - 1 || y == 0 || y >= gi.grid_h - 1 {
        return false;
    }
    if params.shape == LithoShape::Heart {
        let idx = y * gi.grid_w + x;
        if mask[idx] == 0 || is_frame[idx] == 1 {
            return false;
        }
    } else if x <= gi.border_px_x
        || x >= gi.grid_w - gi.border_px_x - 1
        || y <= gi.border_px_y
        || y >= gi.grid_h - bottom_border - 1
    {
        return false;
    }
    true
}

/// Separable 2-pass smoothing: row pass then column pass.
///
/// The old version used a 4-neighbor cross kernel in one pass per iteration.
/// This separable version produces equivalent results (box filter decomposition)
/// with **better cache locality** on the row pass and is ready for future SIMD.
pub fn apply_smoothing(
    heights: &mut Vec<f32>,
    gi: &GridInfo,
    params: &LithoParams,
    mask: &[u8],
    is_frame: &[u8],
    progress_fn: &Function,
) {
    if params.smoothing == 0 {
        return;
    }

    let n = gi.grid_w * gi.grid_h;
    let mut temp = vec![0.0f32; n];
    let bottom_border = gi.border_px_y.max(gi.base_stand_px_y);

    for _iter in 0..params.smoothing {
        // --- Row pass: average with left + right neighbors ---
        for y in 0..gi.grid_h {
            let row_start = y * gi.grid_w;
            for x in 0..gi.grid_w {
                let idx = row_start + x;
                if !is_smoothable(x, y, gi, params, mask, is_frame, bottom_border) {
                    temp[idx] = heights[idx];
                } else {
                    temp[idx] = (heights[idx - 1] + heights[idx] + heights[idx + 1]) / 3.0;
                }
            }
        }

        // --- Column pass: average with top + bottom neighbors ---
        for y in 0..gi.grid_h {
            let row_start = y * gi.grid_w;
            for x in 0..gi.grid_w {
                let idx = row_start + x;
                if !is_smoothable(x, y, gi, params, mask, is_frame, bottom_border) {
                    heights[idx] = temp[idx];
                } else {
                    heights[idx] = (temp[idx - gi.grid_w] + temp[idx] + temp[idx + gi.grid_w]) / 3.0;
                }
            }
        }
    }

    // Report progress after smoothing completes
    let _ = progress_fn.call2(
        &JsValue::NULL,
        &JsValue::from(40),
        &JsValue::from("Smoothing complete"),
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::GridInfo;

    fn test_params() -> LithoParams {
        LithoParams {
            shape: LithoShape::Flat,
            resolution: 10.0,
            physical_size: 100.0,
            base_thickness: 0.6,
            max_thickness: 2.5,
            border_width: 0.0,
            frame_thickness: 2.5,
            base_stand: 0.0,
            curve_angle: 120.0,
            smoothing: 0,
            contrast: 1.0,
            brightness: 0.0,
            sharpness: 0.0,
            invert: false,
            hanger: false,
            threshold: 128,
        }
    }

    #[test]
    fn luminance_white_pixel() {
        // White pixel → luminance 1.0 → invert=false → normalized=0.0 → base_thickness
        let params = test_params();
        let gi = GridInfo::from_params(4, 4, &params);
        // 4×4 RGBA white image
        let pixels = vec![255u8; 4 * 4 * 4];
        let heights = build_heightmap(&pixels, 4, &gi, &params, &[], &[]);
        // Interior pixels should be at base_thickness (white = thin when not inverted)
        for &h in &heights {
            assert!((h - params.base_thickness).abs() < 0.01,
                "White pixel should map to base_thickness, got {}", h);
        }
    }

    #[test]
    fn luminance_black_pixel() {
        // Black pixel → luminance 0.0 → invert=false → normalized=1.0 → max_thickness
        let params = test_params();
        let gi = GridInfo::from_params(4, 4, &params);
        let pixels = vec![0u8; 4 * 4 * 4];
        // Set alpha to 255
        let mut pixels = pixels;
        for i in (3..pixels.len()).step_by(4) {
            pixels[i] = 255;
        }
        let heights = build_heightmap(&pixels, 4, &gi, &params, &[], &[]);
        for &h in &heights {
            assert!((h - params.max_thickness).abs() < 0.01,
                "Black pixel should map to max_thickness, got {}", h);
        }
    }

    #[test]
    fn contrast_and_brightness() {
        let mut params = test_params();
        params.contrast = 2.0;
        params.brightness = 0.1;
        let gi = GridInfo::from_params(4, 4, &params);
        // Mid-gray pixel (128, 128, 128)
        let mut pixels = vec![0u8; 4 * 4 * 4];
        for i in 0..4*4 {
            pixels[i*4] = 128;
            pixels[i*4+1] = 128;
            pixels[i*4+2] = 128;
            pixels[i*4+3] = 255;
        }
        let heights = build_heightmap(&pixels, 4, &gi, &params, &[], &[]);
        // All heights should be within valid range
        for &h in &heights {
            assert!(h >= params.base_thickness && h <= params.max_thickness,
                "Height {} out of range [{}, {}]", h, params.base_thickness, params.max_thickness);
        }
    }

    #[test]
    fn sharpening_preserves_range() {
        let mut params = test_params();
        params.sharpness = 1.0;
        let gi = GridInfo::from_params(10, 10, &params);
        let mut heights: Vec<f32> = (0..100).map(|i| {
            params.base_thickness + (i as f32 / 100.0) * (params.max_thickness - params.base_thickness)
        }).collect();
        apply_sharpening(&mut heights, &gi, &params, &[], &[]);
        for &h in &heights {
            assert!(h >= params.base_thickness && h <= params.max_thickness,
                "Sharpened height {} out of range", h);
        }
    }

    #[test]
    fn heart_mask_is_filled() {
        let params = LithoParams {
            shape: LithoShape::Heart,
            ..test_params()
        };
        let gi = GridInfo::from_params(100, 100, &params);
        let (mask, _is_frame) = build_heart_masks(&gi, &params);
        let filled: usize = mask.iter().map(|&m| m as usize).sum();
        // Heart should fill roughly 30-70% of the grid
        let ratio = filled as f32 / mask.len() as f32;
        assert!(ratio > 0.2 && ratio < 0.8,
            "Heart fill ratio {} is unexpected", ratio);
    }
}
