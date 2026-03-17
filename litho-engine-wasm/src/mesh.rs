use crate::types::{BBox, GridInfo, LithoParams, LithoShape};
use std::f32::consts::PI;

/// Result of mesh generation — all data the caller needs.
pub struct MeshResult {
    pub max_top_x: f32,
    pub max_top_y: f32,
    pub max_top_z: f32,
    pub effective_angle_rad: f32,
    pub bbox: BBox,
}

/// Generate all vertex positions and UVs for the lithophane mesh.
///
/// Produces `2 * grid_w * grid_h` vertices — top shell and bottom shell —
/// each with position (3× f32) and UV (2× f32).
///
/// Pre-computes sin/cos lookup tables per X column, eliminating redundant
/// trig calls across all Y rows. Also accumulates bounding box inline.
pub fn generate_mesh_positions(
    heights: &[f32],
    gi: &GridInfo,
    params: &LithoParams,
    positions: &mut [f32],
    uvs: &mut [f32],
) -> MeshResult {
    let gw = gi.grid_w;
    let gh = gi.grid_h;
    let offset = gw * gh;

    // Effective curve angle (matches original logic exactly)
    let effective_angle_rad: f32 = match params.shape {
        LithoShape::Cylinder
        | LithoShape::Sphere
        | LithoShape::Dome
        | LithoShape::Lampshade
        | LithoShape::Vase => 2.0 * PI,
        LithoShape::Arc => params.curve_angle * PI / 180.0,
        _ => 0.0,
    };

    let mut max_top_y: f32 = f32::NEG_INFINITY;
    let mut max_top_x: f32 = 0.0;
    let mut max_top_z: f32 = 0.0;
    let mut bbox = BBox::empty();

    // --- Pre-compute trig lookup tables per X column ---
    // For shapes that use θ = f(x), sin/cos only depend on X and are
    // constant across all Y rows. Pre-computing saves (gh-1) × gw
    // redundant sin_cos() calls (~50ns each on ARM WASM).

    // θ-LUT: used by Sphere, Dome, Lampshade, Vase, Cylinder, Arc
    let theta_lut: Vec<(f32, f32)> = match params.shape {
        LithoShape::Sphere | LithoShape::Dome | LithoShape::Lampshade | LithoShape::Vase => {
            (0..gw)
                .map(|x| {
                    let theta = (x as f32 / (gw as f32 - 1.0)) * 2.0 * PI;
                    theta.sin_cos()
                })
                .collect()
        }
        _ if effective_angle_rad > 0.01 => {
            // Arc + Cylinder: θ = px_flat / r
            let r = gi.physical_width / effective_angle_rad;
            (0..gw)
                .map(|x| {
                    let px_flat = (x as f32 - gw as f32 / 2.0) * gi.physical_scale;
                    (px_flat / r).sin_cos()
                })
                .collect()
        }
        _ => Vec::new(), // Flat / Heart — no trig needed
    };

    // UV denominators (hoisted out of inner loop)
    let inv_gw = 1.0 / (gw - 1) as f32;
    let inv_gh = 1.0 / (gh - 1) as f32;

    for y in 0..gh {
        // Per-row constants (shape-dependent)
        let py = (gh as f32 / 2.0 - y as f32) * gi.physical_scale;

        for x in 0..gw {
            let h_top = heights[y * gw + x];
            let h_bot = 0.0_f32;

            let (top_x, top_y, top_z, bot_x, bot_y, bot_z);

            match params.shape {
                LithoShape::Sphere => {
                    let hole_angle = PI / 12.0;
                    let phi_range = PI - 2.0 * hole_angle;
                    let phi = hole_angle + (y as f32 / (gh as f32 - 1.0)) * phi_range;
                    let r = gi.physical_width / (2.0 * PI);

                    let r_top = r + h_top;
                    let r_bot = r + h_bot;

                    let (sin_t, cos_t) = theta_lut[x];
                    let (sin_p, cos_p) = phi.sin_cos();

                    top_x = r_top * sin_p * sin_t;
                    top_y = r_top * cos_p;
                    top_z = r_top * sin_p * cos_t;

                    bot_x = r_bot * sin_p * sin_t;
                    bot_y = r_bot * cos_p;
                    bot_z = r_bot * sin_p * cos_t;
                }
                LithoShape::Dome => {
                    let hole_angle = PI / 24.0;
                    let phi_range = PI / 2.0 - hole_angle;
                    let phi = hole_angle + (y as f32 / (gh as f32 - 1.0)) * phi_range;
                    let r = gi.physical_width / (2.0 * PI);

                    let r_top = r + h_top;
                    let r_bot = r + h_bot;

                    let (sin_t, cos_t) = theta_lut[x];
                    let (sin_p, cos_p) = phi.sin_cos();

                    top_x = r_top * sin_p * sin_t;
                    top_y = r_top * cos_p;
                    top_z = r_top * sin_p * cos_t;

                    bot_x = r_bot * sin_p * sin_t;
                    bot_y = r_bot * cos_p;
                    bot_z = r_bot * sin_p * cos_t;
                }
                LithoShape::Lampshade => {
                    let t_y = y as f32 / (gh as f32 - 1.0); // 0 = top, 1 = bottom
                    let r_bottom = gi.physical_width / (2.0 * PI);
                    let r_top_radius = r_bottom * 0.5;
                    let r = r_top_radius + t_y * (r_bottom - r_top_radius);

                    let (sin_t, cos_t) = theta_lut[x];

                    top_x = (r + h_top) * sin_t;
                    top_y = (0.5 - t_y) * gi.physical_height;
                    top_z = (r + h_top) * cos_t;

                    bot_x = (r + h_bot) * sin_t;
                    bot_y = (0.5 - t_y) * gi.physical_height;
                    bot_z = (r + h_bot) * cos_t;
                }
                LithoShape::Vase => {
                    let t_y = y as f32 / (gh as f32 - 1.0); // 0 = top (rim), 1 = bottom (base)
                    let r_base = gi.physical_width / (2.0 * PI);

                    // Sigmoid profile: wide at base, narrows in middle, flares slightly at rim
                    let profile_base = 1.0_f32;
                    let profile_neck = 0.55_f32;
                    let profile_rim = 0.85_f32;
                    let profile = if t_y > 0.5 {
                        // bottom half: base → neck
                        let s = (t_y - 0.5) * 2.0;
                        profile_neck + s * (profile_base - profile_neck)
                    } else {
                        // top half: neck → rim
                        let s = t_y * 2.0;
                        profile_rim + s * (profile_neck - profile_rim)
                    };
                    let r = r_base * profile;

                    let (sin_t, cos_t) = theta_lut[x];

                    top_x = (r + h_top) * sin_t;
                    top_y = (0.5 - t_y) * gi.physical_height;
                    top_z = (r + h_top) * cos_t;

                    bot_x = (r + h_bot) * sin_t;
                    bot_y = (0.5 - t_y) * gi.physical_height;
                    bot_z = (r + h_bot) * cos_t;
                }
                _ if effective_angle_rad > 0.01 => {
                    // Arc + Cylinder — trig from LUT
                    let r = gi.physical_width / effective_angle_rad;
                    let (sin_t, cos_t) = theta_lut[x];

                    top_x = (r + h_top) * sin_t;
                    top_y = py;
                    top_z = (r + h_top) * cos_t - r;

                    bot_x = (r + h_bot) * sin_t;
                    bot_y = py;
                    bot_z = (r + h_bot) * cos_t - r;
                }
                _ => {
                    // Flat (also used for heart)
                    let px_flat = (x as f32 - gw as f32 / 2.0) * gi.physical_scale;
                    top_x = px_flat;
                    top_y = py;
                    top_z = h_top;

                    bot_x = px_flat;
                    bot_y = py;
                    bot_z = h_bot;
                }
            }

            let idx = y * gw + x;
            let u = x as f32 * inv_gw;
            let v_uv = 1.0 - (y as f32 * inv_gh);

            // Top vertex
            positions[idx * 3]     = top_x;
            positions[idx * 3 + 1] = top_y;
            positions[idx * 3 + 2] = top_z;
            uvs[idx * 2]     = u;
            uvs[idx * 2 + 1] = v_uv;

            // Bottom vertex
            let bi = offset + idx;
            positions[bi * 3]     = bot_x;
            positions[bi * 3 + 1] = bot_y;
            positions[bi * 3 + 2] = bot_z;
            uvs[bi * 2]     = u;
            uvs[bi * 2 + 1] = v_uv;

            // Accumulate bounding box inline (eliminates separate O(n) pass)
            bbox.update(top_x, top_y, top_z);
            bbox.update(bot_x, bot_y, bot_z);

            if top_y > max_top_y {
                max_top_y = top_y;
                max_top_x = top_x;
                max_top_z = top_z;
            }
        }
    }

    MeshResult {
        max_top_x,
        max_top_y,
        max_top_z,
        effective_angle_rad,
        bbox,
    }
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
    fn flat_mesh_positions_are_finite() {
        let params = test_params(LithoShape::Flat);
        let gi = GridInfo::from_params(10, 10, &params);
        let n = gi.grid_w * gi.grid_h;
        let heights = vec![1.0f32; n];
        let mut positions = vec![0.0f32; n * 2 * 3];
        let mut uvs = vec![0.0f32; n * 2 * 2];
        let result = generate_mesh_positions(&heights, &gi, &params, &mut positions, &mut uvs);
        for &p in &positions {
            assert!(p.is_finite(), "Position is not finite: {}", p);
        }
        assert!(result.max_top_x.is_finite());
        assert!(result.max_top_y.is_finite());
        assert!(result.max_top_z.is_finite());
        assert!(result.bbox.min_x.is_finite());
        assert!(result.bbox.max_x.is_finite());
    }

    #[test]
    fn cylinder_mesh_symmetry() {
        let params = test_params(LithoShape::Cylinder);
        let gi = GridInfo::from_params(10, 10, &params);
        let n = gi.grid_w * gi.grid_h;
        let heights = vec![1.0f32; n];
        let mut positions = vec![0.0f32; n * 2 * 3];
        let mut uvs = vec![0.0f32; n * 2 * 2];
        generate_mesh_positions(&heights, &gi, &params, &mut positions, &mut uvs);
        // All positions should be finite
        for &p in &positions {
            assert!(p.is_finite(), "Cylinder position NaN/Inf");
        }
    }

    #[test]
    fn uvs_are_in_unit_range() {
        let params = test_params(LithoShape::Flat);
        let gi = GridInfo::from_params(10, 10, &params);
        let n = gi.grid_w * gi.grid_h;
        let heights = vec![1.0f32; n];
        let mut positions = vec![0.0f32; n * 2 * 3];
        let mut uvs = vec![0.0f32; n * 2 * 2];
        generate_mesh_positions(&heights, &gi, &params, &mut positions, &mut uvs);
        for &uv in &uvs {
            assert!(uv >= 0.0 && uv <= 1.0, "UV out of [0,1]: {}", uv);
        }
    }
}
