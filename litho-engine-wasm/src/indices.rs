use crate::types::{GridInfo, LithoParams, LithoShape};
use std::f32::consts::PI;

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
    effective_angle_rad: f32,
) -> Vec<u32> {
    let gw = gi.grid_w;
    let gh = gi.grid_h;
    let offset = (gw * gh) as u32;

    let is_full_cyl = params.shape == LithoShape::Cylinder
        || params.shape == LithoShape::Sphere
        || params.shape == LithoShape::Dome
        || params.shape == LithoShape::Lampshade
        || params.shape == LithoShape::Vase
        || effective_angle_rad >= 359.9 * PI / 180.0;

    let effective_mask: &[u8] = if params.shape == LithoShape::Heart {
        mask
    } else {
        &[]
    };

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{GridInfo, LithoParams, LithoShape};

    fn test_params(shape: LithoShape) -> LithoParams {
        LithoParams {
            shape,
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
    fn flat_indices_all_in_range() {
        let params = test_params(LithoShape::Flat);
        let gi = GridInfo::from_params(10, 10, &params);
        let total_verts = gi.grid_w * gi.grid_h * 2;
        let indices = generate_indices(&gi, &params, &[], 120.0 * PI / 180.0);
        for &i in &indices {
            assert!((i as usize) < total_verts,
                "Index {} >= vertex count {}", i, total_verts);
        }
    }

    #[test]
    fn flat_indices_divisible_by_3() {
        let params = test_params(LithoShape::Flat);
        let gi = GridInfo::from_params(10, 10, &params);
        let indices = generate_indices(&gi, &params, &[], 120.0 * PI / 180.0);
        assert!(indices.len() % 3 == 0, "Index count {} not divisible by 3", indices.len());
    }

    #[test]
    fn cylinder_indices_in_range() {
        let params = test_params(LithoShape::Cylinder);
        let gi = GridInfo::from_params(10, 10, &params);
        let total_verts = gi.grid_w * gi.grid_h * 2;
        let indices = generate_indices(&gi, &params, &[], 2.0 * PI);
        assert!(!indices.is_empty());
        for &i in &indices {
            assert!((i as usize) < total_verts,
                "Cylinder index {} >= vertex count {}", i, total_verts);
        }
    }

    #[test]
    fn heart_mask_excludes_outside() {
        let params = test_params(LithoShape::Heart);
        let gi = GridInfo::from_params(10, 10, &params);
        let mask = vec![0u8; gi.grid_w * gi.grid_h];
        let indices = generate_indices(&gi, &params, &mask, 120.0 * PI / 180.0);
        assert!(indices.is_empty(), "Heart with empty mask should produce no faces");
    }
}
