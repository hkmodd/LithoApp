/// Compute per-vertex normals (area-weighted) from positions + indices.
///
/// This is the Rust equivalent of Three.js `BufferGeometry.computeVertexNormals()`.
/// Uses `.chunks_exact(3)` iterators for bounds-check elimination.
pub fn compute_vertex_normals(positions: &[f32], indices: &[u32]) -> Vec<f32> {
    let vertex_count = positions.len() / 3;
    let mut normals = vec![0.0f32; vertex_count * 3];

    // Pass 1: accumulate area-weighted face normals onto each vertex
    for tri in indices.chunks_exact(3) {
        let ia = tri[0] as usize;
        let ib = tri[1] as usize;
        let ic = tri[2] as usize;

        let (ia3, ib3, ic3) = (ia * 3, ib * 3, ic * 3);

        let ax = positions[ia3];
        let ay = positions[ia3 + 1];
        let az = positions[ia3 + 2];

        let bx = positions[ib3];
        let by = positions[ib3 + 1];
        let bz = positions[ib3 + 2];

        let cx = positions[ic3];
        let cy = positions[ic3 + 1];
        let cz = positions[ic3 + 2];

        // Edge vectors
        let e1x = bx - ax;
        let e1y = by - ay;
        let e1z = bz - az;
        let e2x = cx - ax;
        let e2y = cy - ay;
        let e2z = cz - az;

        // Cross product (magnitude ∝ triangle area → area-weighted)
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;

        // Accumulate onto each vertex of the face
        normals[ia3]     += nx;
        normals[ia3 + 1] += ny;
        normals[ia3 + 2] += nz;

        normals[ib3]     += nx;
        normals[ib3 + 1] += ny;
        normals[ib3 + 2] += nz;

        normals[ic3]     += nx;
        normals[ic3 + 1] += ny;
        normals[ic3 + 2] += nz;
    }

    // Pass 2: normalize each vertex normal to unit length
    for chunk in normals.chunks_exact_mut(3) {
        let x = chunk[0];
        let y = chunk[1];
        let z = chunk[2];
        let len_sq = x * x + y * y + z * z;
        if len_sq > 1e-16 {
            let inv = 1.0 / len_sq.sqrt();
            chunk[0] = x * inv;
            chunk[1] = y * inv;
            chunk[2] = z * inv;
        }
    }

    normals
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unit_length_normals() {
        // Simple quad: two triangles
        #[rustfmt::skip]
        let positions: Vec<f32> = vec![
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
        ];
        let indices: Vec<u32> = vec![0, 1, 2, 0, 2, 3];
        let normals = compute_vertex_normals(&positions, &indices);

        assert_eq!(normals.len(), 12);
        for chunk in normals.chunks_exact(3) {
            let len = (chunk[0] * chunk[0] + chunk[1] * chunk[1] + chunk[2] * chunk[2]).sqrt();
            assert!((len - 1.0).abs() < 1e-5, "Normal not unit length: {}", len);
        }
    }

    #[test]
    fn flat_quad_normals_point_up() {
        // Quad in XY plane → normals should point in +Z or -Z
        #[rustfmt::skip]
        let positions: Vec<f32> = vec![
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
        ];
        let indices: Vec<u32> = vec![0, 1, 2, 0, 2, 3];
        let normals = compute_vertex_normals(&positions, &indices);

        for chunk in normals.chunks_exact(3) {
            let z = chunk[2];
            assert!(z.abs() > 0.9, "Expected normal along Z, got z={}", z);
        }
    }

    #[test]
    fn no_nan_normals() {
        #[rustfmt::skip]
        let positions: Vec<f32> = vec![
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0.5, 1.0, 0.5,
        ];
        let indices: Vec<u32> = vec![0, 1, 2];
        let normals = compute_vertex_normals(&positions, &indices);
        for &n in &normals {
            assert!(n.is_finite(), "Normal is NaN or Inf: {}", n);
        }
    }

    #[test]
    fn degenerate_triangle() {
        // All vertices at same point → zero area → normals should be zero
        #[rustfmt::skip]
        let positions: Vec<f32> = vec![
            1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
        ];
        let indices: Vec<u32> = vec![0, 1, 2];
        let normals = compute_vertex_normals(&positions, &indices);
        for &n in &normals {
            assert!(n.abs() < 1e-8, "Degenerate triangle should have zero normals");
        }
    }
}
