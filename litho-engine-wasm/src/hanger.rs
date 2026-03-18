use crate::types::LithoParams;
use std::f32::consts::PI;

pub const HANGER_SEGMENTS: usize = 32;

/// Number of extra vertices needed for the hanger ring.
pub fn hanger_vertex_count(params: &LithoParams) -> usize {
    if params.hanger {
        match params.shape {
            crate::types::LithoShape::Flat
            | crate::types::LithoShape::Arc
            | crate::types::LithoShape::Heart => HANGER_SEGMENTS * 4,
            _ => 0,
        }
    } else {
        0
    }
}

/// Write hanger ring vertices into `positions` / `uvs` and return hanger triangle indices.
pub fn generate_hanger(
    positions: &mut [f32],
    uvs: &mut [f32],
    hanger_offset: usize,
    params: &LithoParams,
    max_top_x: f32,
    max_top_y: f32,
    max_top_z: f32,
    physical_width: f32,
    physical_height: f32,
    effective_angle_rad: f32,
) -> Vec<u32> {
    let outer_r = 5.0_f32;
    let inner_r = 3.0_f32;
    let thickness = params.frame_thickness;

    // For Flat / Arc the mesh is centred at X = 0 — place the hanger there.
    // For Heart, max_top_x marks the centre of the top-notch, which is correct.
    let cx = match params.shape {
        crate::types::LithoShape::Heart => max_top_x,
        _ => 0.0,
    };
    let cy = if max_top_y == f32::NEG_INFINITY {
        physical_height / 2.0
    } else {
        max_top_y
    } + outer_r
        - 1.0;

    let cz = match params.shape {
        crate::types::LithoShape::Arc => {
            let _r = physical_width / effective_angle_rad;
            0.0
        }
        crate::types::LithoShape::Heart => max_top_z - thickness,
        _ => 0.0,
    };

    // Write vertices
    for i in 0..HANGER_SEGMENTS {
        let theta = (i as f32 / HANGER_SEGMENTS as f32) * 2.0 * PI;
        let (sin_t, cos_t) = theta.sin_cos();

        let vi = hanger_offset + i * 4;

        // Top outer
        positions[(vi + 0) * 3] = cx + outer_r * cos_t;
        positions[(vi + 0) * 3 + 1] = cy + outer_r * sin_t;
        positions[(vi + 0) * 3 + 2] = cz + thickness;
        uvs[(vi + 0) * 2] = 0.0;
        uvs[(vi + 0) * 2 + 1] = 0.0;

        // Top inner
        positions[(vi + 1) * 3] = cx + inner_r * cos_t;
        positions[(vi + 1) * 3 + 1] = cy + inner_r * sin_t;
        positions[(vi + 1) * 3 + 2] = cz + thickness;
        uvs[(vi + 1) * 2] = 0.0;
        uvs[(vi + 1) * 2 + 1] = 0.0;

        // Bottom outer
        positions[(vi + 2) * 3] = cx + outer_r * cos_t;
        positions[(vi + 2) * 3 + 1] = cy + outer_r * sin_t;
        positions[(vi + 2) * 3 + 2] = cz;
        uvs[(vi + 2) * 2] = 0.0;
        uvs[(vi + 2) * 2 + 1] = 0.0;

        // Bottom inner
        positions[(vi + 3) * 3] = cx + inner_r * cos_t;
        positions[(vi + 3) * 3 + 1] = cy + inner_r * sin_t;
        positions[(vi + 3) * 3 + 2] = cz;
        uvs[(vi + 3) * 2] = 0.0;
        uvs[(vi + 3) * 2 + 1] = 0.0;
    }

    // Generate indices
    let mut indices: Vec<u32> = Vec::with_capacity(HANGER_SEGMENTS * 24);
    for i in 0..HANGER_SEGMENTS {
        let next = (i + 1) % HANGER_SEGMENTS;
        let i4 = (hanger_offset + i * 4) as u32;
        let n4 = (hanger_offset + next * 4) as u32;

        // Top face
        indices.extend_from_slice(&[i4, i4 + 1, n4, n4, i4 + 1, n4 + 1]);
        // Bottom face (reversed)
        indices.extend_from_slice(&[i4 + 2, n4 + 2, i4 + 3, n4 + 2, n4 + 3, i4 + 3]);
        // Outer wall
        indices.extend_from_slice(&[i4, n4, i4 + 2, n4, n4 + 2, i4 + 2]);
        // Inner wall (reversed)
        indices.extend_from_slice(&[i4 + 1, i4 + 3, n4 + 1, n4 + 1, i4 + 3, n4 + 3]);
    }

    indices
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{LithoParams, LithoShape};

    fn test_params() -> LithoParams {
        LithoParams {
            shape: LithoShape::Flat,
            resolution: 500.0,
            physical_size: 100.0,
            base_thickness: 0.6,
            max_thickness: 2.5,
            border_width: 2.0,
            frame_thickness: 2.5,
            base_stand: 0.0,
            curve_angle: 120.0,
            smoothing: 0,
            contrast: 1.0,
            brightness: 0.0,
            sharpness: 0.0,
            invert: false,
            hanger: true,
            threshold: 128,
        }
    }

    #[test]
    fn hanger_vertex_count_flat() {
        let params = test_params();
        assert_eq!(hanger_vertex_count(&params), HANGER_SEGMENTS * 4);
    }

    #[test]
    fn hanger_vertex_count_cylinder() {
        let mut params = test_params();
        params.shape = LithoShape::Cylinder;
        assert_eq!(hanger_vertex_count(&params), 0);
    }

    #[test]
    fn hanger_generates_correct_index_count() {
        let params = test_params();
        let vc = hanger_vertex_count(&params);
        let total_verts = 200 + vc; // some base + hanger
        let mut positions = vec![0.0f32; total_verts * 3];
        let mut uvs = vec![0.0f32; total_verts * 2];
        let indices = generate_hanger(
            &mut positions, &mut uvs, 200, &params,
            0.0, 50.0, 0.0, 100.0, 80.0, 2.094,
        );
        assert_eq!(indices.len(), HANGER_SEGMENTS * 24); // 4 faces × 6 indices × 32 segments
    }
}
