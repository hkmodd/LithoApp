use crate::types::{GridInfo, LithoParams, LithoShape};
use std::f64::consts::PI;

/// Check whether the quad at (x, y) is "solid" (should produce triangles).
fn is_solid(
    x: isize,
    y: isize,
    gi: &GridInfo,
    mask: &[u8],
    is_full_cylinder: bool,
) -> bool {
    if y < 0 || y >= gi.grid_h as isize - 1 {
        return false;
    }

    let check_x = if is_full_cylinder {
        ((x + (gi.grid_w as isize - 1)) % (gi.grid_w as isize - 1)) as usize
    } else {
        if x < 0 || x >= gi.grid_w as isize - 1 {
            return false;
        }
        x as usize
    };

    let check_y = y as usize;
    let gw = gi.grid_w;

    if gi.grid_w == 0 {
        return false;
    }

    // Heart shape: all 4 corners of the quad must be inside the mask
    if mask.len() == gw * gi.grid_h {
        // mask is populated (heart shape)
        mask[check_y * gw + check_x] == 1
            && mask[check_y * gw + check_x + 1] == 1
            && mask[(check_y + 1) * gw + check_x] == 1
            && mask[(check_y + 1) * gw + check_x + 1] == 1
    } else {
        true
    }
}

/// Generate all triangle indices: top surface, bottom surface, and side walls.
/// Pre-estimates capacity to avoid reallocations.
pub fn generate_indices(
    gi: &GridInfo,
    params: &LithoParams,
    mask: &[u8],
    effective_angle_rad: f64,
) -> Vec<u32> {
    let gw = gi.grid_w;
    let gh = gi.grid_h;
    let offset = (gw * gh) as u32;

    let is_full_cyl = params.shape == LithoShape::Cylinder
        || params.shape == LithoShape::Sphere
        || effective_angle_rad >= 359.9 * PI / 180.0;

    // Use the heart mask only if shape is heart; otherwise pass empty slice
    let effective_mask: &[u8] = if params.shape == LithoShape::Heart {
        mask
    } else {
        &[]
    };

    // Pre-estimate: worst case ~12 indices per grid cell
    let est_capacity = (gw - 1) * (gh - 1) * 12 + (gw + gh) * 12;
    let mut indices: Vec<u32> = Vec::with_capacity(est_capacity);

    // --- Top surface ---
    for y in 0..(gh - 1) {
        for x in 0..(gw - 1) {
            if !is_solid(x as isize, y as isize, gi, effective_mask, is_full_cyl) {
                continue;
            }
            let a = (y * gw + x) as u32;
            let b = (y * gw + x + 1) as u32;
            let c = ((y + 1) * gw + x) as u32;
            let d = ((y + 1) * gw + x + 1) as u32;

            if is_full_cyl && x == gw - 2 {
                let b_w = (y * gw) as u32;
                let d_w = ((y + 1) * gw) as u32;
                indices.extend_from_slice(&[a, c, b_w, b_w, c, d_w]);
            } else {
                indices.extend_from_slice(&[a, c, b, b, c, d]);
            }
        }
    }

    // --- Bottom surface (reversed winding) ---
    for y in 0..(gh - 1) {
        for x in 0..(gw - 1) {
            if !is_solid(x as isize, y as isize, gi, effective_mask, is_full_cyl) {
                continue;
            }
            let a = offset + (y * gw + x) as u32;
            let b = offset + (y * gw + x + 1) as u32;
            let c = offset + ((y + 1) * gw + x) as u32;
            let d = offset + ((y + 1) * gw + x + 1) as u32;

            if is_full_cyl && x == gw - 2 {
                let b_w = offset + (y * gw) as u32;
                let d_w = offset + ((y + 1) * gw) as u32;
                indices.extend_from_slice(&[a, b_w, c, b_w, d_w, c]);
            } else {
                indices.extend_from_slice(&[a, b, c, b, d, c]);
            }
        }
    }

    // --- Side walls ---
    for y in -1..gh as isize {
        for x in -1..gw as isize {
            let current = is_solid(x, y, gi, effective_mask, is_full_cyl);
            let right = is_solid(x + 1, y, gi, effective_mask, is_full_cyl);
            let bottom = is_solid(x, y + 1, gi, effective_mask, is_full_cyl);

            if current != right {
                let edge_x = (x + 1) as usize;
                if edge_x < gw && y >= 0 && (y as usize) < gh - 1 {
                    let yu = y as usize;
                    let t1 = (yu * gw + edge_x) as u32;
                    let t2 = ((yu + 1) * gw + edge_x) as u32;
                    let b1 = offset + t1;
                    let b2 = offset + t2;
                    if current {
                        indices.extend_from_slice(&[t1, t2, b1, t2, b2, b1]);
                    } else {
                        indices.extend_from_slice(&[t1, b1, t2, t2, b1, b2]);
                    }
                }
            }

            if current != bottom {
                let edge_y = (y + 1) as usize;
                if edge_y < gh && x >= 0 && (x as usize) < gw - 1 {
                    let xu = x as usize;
                    let t1 = (edge_y * gw + xu) as u32;
                    let t2 = (edge_y * gw + xu + 1) as u32;
                    let b1 = offset + t1;
                    let b2 = offset + t2;

                    let real_t2;
                    let real_b2;
                    if is_full_cyl && xu == gw - 2 {
                        real_t2 = (edge_y * gw) as u32;
                        real_b2 = offset + real_t2;
                    } else {
                        real_t2 = t2;
                        real_b2 = b2;
                    }

                    if current {
                        indices.extend_from_slice(&[t1, b1, real_t2, real_t2, b1, real_b2]);
                    } else {
                        indices.extend_from_slice(&[t1, real_t2, b1, real_t2, real_b2, b1]);
                    }
                }
            }
        }
    }

    indices
}
