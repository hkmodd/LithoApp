/// Compute per-vertex normals (area-weighted) from positions + indices.
///
/// This is the Rust equivalent of Three.js `BufferGeometry.computeVertexNormals()`.
/// Running in WASM avoids the round-trip WASM→JS→TS→JS that the old TS version required.
pub fn compute_vertex_normals(positions: &[f32], indices: &[u32]) -> Vec<f32> {
    let vertex_count = positions.len() / 3;
    let mut normals = vec![0.0f32; vertex_count * 3];

    // Pass 1: accumulate area-weighted face normals onto each vertex
    let tri_count = indices.len() / 3;
    for t in 0..tri_count {
        let ia = indices[t * 3] as usize;
        let ib = indices[t * 3 + 1] as usize;
        let ic = indices[t * 3 + 2] as usize;

        let ax = positions[ia * 3];
        let ay = positions[ia * 3 + 1];
        let az = positions[ia * 3 + 2];

        let bx = positions[ib * 3];
        let by = positions[ib * 3 + 1];
        let bz = positions[ib * 3 + 2];

        let cx = positions[ic * 3];
        let cy = positions[ic * 3 + 1];
        let cz = positions[ic * 3 + 2];

        // Edge vectors
        let e1x = bx - ax;
        let e1y = by - ay;
        let e1z = bz - az;
        let e2x = cx - ax;
        let e2y = cy - ay;
        let e2z = cz - az;

        // Cross product (magnitude = 2× triangle area → area-weighted)
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;

        // Accumulate onto each vertex of the face
        normals[ia * 3] += nx;
        normals[ia * 3 + 1] += ny;
        normals[ia * 3 + 2] += nz;

        normals[ib * 3] += nx;
        normals[ib * 3 + 1] += ny;
        normals[ib * 3 + 2] += nz;

        normals[ic * 3] += nx;
        normals[ic * 3 + 1] += ny;
        normals[ic * 3 + 2] += nz;
    }

    // Pass 2: normalize each vertex normal to unit length
    for i in 0..vertex_count {
        let ox = i * 3;
        let x = normals[ox];
        let y = normals[ox + 1];
        let z = normals[ox + 2];
        let len = (x * x + y * y + z * z).sqrt();
        if len > 1e-8 {
            let inv = 1.0 / len;
            normals[ox] = x * inv;
            normals[ox + 1] = y * inv;
            normals[ox + 2] = z * inv;
        }
    }

    normals
}
