use crate::types::{GridInfo, LithoParams, LithoShape};
use std::f64::consts::PI;

/// Result of vertex generation — positions, UVs, and the top-center point for hanger placement.
pub struct VertexResult {
    pub positions: Vec<f32>,
    pub uvs: Vec<f32>,
    pub max_top_x: f64,
    pub max_top_y: f64,
    pub max_top_z: f64,
}

/// Generate top + bottom vertices for all grid cells.
/// Handles all 5 shape projections: flat, arc, cylinder, sphere, heart.
pub fn generate_vertices(
    heights: &[f32],
    gi: &GridInfo,
    params: &LithoParams,
    mask: &[u8],
    hanger_vert_count: usize,
) -> VertexResult {
    let num_verts = gi.grid_w * gi.grid_h * 2 + hanger_vert_count;
    let mut positions = vec![0.0f32; num_verts * 3];
    let mut uvs = vec![0.0f32; num_verts * 2];

    // Effective curve angle
    let effective_angle_rad = match params.shape {
        LithoShape::Cylinder => 2.0 * PI,
        LithoShape::Arc => params.curve_angle * PI / 180.0,
        _ => 0.0,
    };

    let mut max_top_y: f64 = f64::NEG_INFINITY;
    let mut max_top_x: f64 = 0.0;
    let mut max_top_z: f64 = 0.0;

    let gw = gi.grid_w;
    let gh = gi.grid_h;

    for y in 0..gh {
        for x in 0..gw {
            let px_flat = (x as f64 - gw as f64 / 2.0) * gi.physical_scale;
            let py = (gh as f64 / 2.0 - y as f64) * gi.physical_scale;
            let h_top = heights[y * gw + x] as f64;
            let h_bot = 0.0;

            let (top_x, top_y, top_z, bot_x, bot_y, bot_z);

            match params.shape {
                LithoShape::Sphere => {
                    let hole_angle = PI / 12.0;
                    let phi_range = PI - 2.0 * hole_angle;
                    let phi = hole_angle + (y as f64 / (gh as f64 - 1.0)) * phi_range;
                    let theta = (x as f64 / (gw as f64 - 1.0)) * 2.0 * PI;
                    let r = gi.physical_width / (2.0 * PI);

                    let r_top = r + h_top;
                    let r_bot = r + h_bot;

                    top_x = r_top * phi.sin() * theta.sin();
                    top_y = r_top * phi.cos();
                    top_z = r_top * phi.sin() * theta.cos();

                    bot_x = r_bot * phi.sin() * theta.sin();
                    bot_y = r_bot * phi.cos();
                    bot_z = r_bot * phi.sin() * theta.cos();
                }
                _ if effective_angle_rad > 0.01 => {
                    let r = gi.physical_width / effective_angle_rad;
                    let theta = px_flat / r;

                    top_x = (r + h_top) * theta.sin();
                    top_y = py;
                    top_z = (r + h_top) * theta.cos() - r;

                    bot_x = (r + h_bot) * theta.sin();
                    bot_y = py;
                    bot_z = (r + h_bot) * theta.cos() - r;
                }
                _ => {
                    // Flat (also used for heart)
                    top_x = px_flat;
                    top_y = py;
                    top_z = h_top;

                    bot_x = px_flat;
                    bot_y = py;
                    bot_z = h_bot;
                }
            }

            // Track top-center for hanger
            if params.shape == LithoShape::Heart {
                if x == gw / 2 && mask[y * gw + x] == 1 && top_y > max_top_y {
                    max_top_y = top_y;
                    max_top_x = top_x;
                    max_top_z = top_z;
                }
            } else if y == 0 && x == gw / 2 {
                max_top_y = top_y;
                max_top_x = top_x;
                max_top_z = top_z;
            }

            // Top vertex
            let ti = y * gw + x;
            positions[ti * 3] = top_x as f32;
            positions[ti * 3 + 1] = top_y as f32;
            positions[ti * 3 + 2] = top_z as f32;
            uvs[ti * 2] = x as f32 / (gw as f32 - 1.0);
            uvs[ti * 2 + 1] = 1.0 - (y as f32 / (gh as f32 - 1.0));

            // Bottom vertex
            let bi = gw * gh + ti;
            positions[bi * 3] = bot_x as f32;
            positions[bi * 3 + 1] = bot_y as f32;
            positions[bi * 3 + 2] = bot_z as f32;
            uvs[bi * 2] = uvs[ti * 2];
            uvs[bi * 2 + 1] = uvs[ti * 2 + 1];
        }
    }

    VertexResult {
        positions,
        uvs,
        max_top_x,
        max_top_y,
        max_top_z,
    }
}
