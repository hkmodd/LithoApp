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

    let gw = gi.grid_w as f64;
    let gh = gi.grid_h as f64;

    for y in 0..gi.grid_h {
        for x in 0..gi.grid_w {
            let nx = (x as f64 / (gw - 1.0)) * 2.4 - 1.2;
            let ny = -((y as f64 / (gh - 1.0)) * 2.2 - 1.1) + 0.1;
            let eq = (nx * nx + ny * ny - 1.0).powi(3) - nx * nx * ny.powi(3);
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

    for y in 0..gi.grid_h {
        for x in 0..gi.grid_w {
            let idx = y * gi.grid_w + x;

            if params.shape == LithoShape::Heart {
                if mask[idx] == 0 {
                    heights[idx] = 0.0;
                    continue;
                }
                if is_frame[idx] == 1 {
                    heights[idx] = params.frame_thickness as f32;
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
                    heights[idx] = current_max as f32;
                    continue;
                }
            }

            // Sample original image
            let orig_x = (x as f64 / gi.scale).floor() as usize;
            let orig_y = (y as f64 / gi.scale).floor() as usize;
            let img_idx = (orig_y * width as usize + orig_x) * 4;

            let r = pixels[img_idx] as f64;
            let g = pixels[img_idx + 1] as f64;
            let b = pixels[img_idx + 2] as f64;

            let mut lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

            // Contrast + brightness
            lum = (lum - 0.5) * params.contrast + 0.5 + params.brightness;
            lum = lum.clamp(0.0, 1.0);

            let normalized = if params.invert { lum } else { 1.0 - lum };
            heights[idx] = (params.base_thickness + normalized * (params.max_thickness - params.base_thickness)) as f32;
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
    let sharp = params.sharpness as f32;

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
            sharpened[idx] = new_h.clamp(params.base_thickness as f32, params.max_thickness as f32);
        }
    }

    *heights = sharpened;
}

/// Laplacian smoothing with ping-pong buffer. Identical logic to the TS version.
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
    let mut buf_b = vec![0.0f32; n];
    let bottom_border = gi.border_px_y.max(gi.base_stand_px_y);

    for _iter in 0..params.smoothing {
        for y in 0..gi.grid_h {
            for x in 0..gi.grid_w {
                let idx = y * gi.grid_w + x;

                if x == 0 || x >= gi.grid_w - 1 || y == 0 || y >= gi.grid_h - 1 {
                    buf_b[idx] = heights[idx];
                    continue;
                }
                if params.shape == LithoShape::Heart && (mask[idx] == 0 || is_frame[idx] == 1) {
                    buf_b[idx] = heights[idx];
                    continue;
                }
                if params.shape != LithoShape::Heart
                    && (x <= gi.border_px_x
                        || x >= gi.grid_w - gi.border_px_x - 1
                        || y <= gi.border_px_y
                        || y >= gi.grid_h - bottom_border - 1)
                {
                    buf_b[idx] = heights[idx];
                    continue;
                }

                let sum = heights[(y - 1) * gi.grid_w + x]
                    + heights[(y + 1) * gi.grid_w + x]
                    + heights[y * gi.grid_w + x - 1]
                    + heights[y * gi.grid_w + x + 1];
                buf_b[idx] = sum / 4.0;
            }
        }
        // Swap
        std::mem::swap(heights, &mut buf_b);
    }

    // Report progress after smoothing completes
    let _ = progress_fn.call2(
        &JsValue::NULL,
        &JsValue::from(40),
        &JsValue::from("Smoothing complete"),
    );
}
