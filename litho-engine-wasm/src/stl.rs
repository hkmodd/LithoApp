/// Binary STL encoder — runs entirely in WASM for zero main-thread blocking.
///
/// Binary STL format:
/// - 80 bytes header
/// - 4 bytes u32 triangle count (little-endian)
/// - For each triangle (50 bytes):
///   - 12 bytes: face normal (3× f32 LE)
///   - 36 bytes: 3 vertices (9× f32 LE)
///   - 2 bytes: attribute byte count (0)

/// Pre-allocated header text.
const HEADER: &[u8; 54] = b"LithoApp Generated STL - Neural Surface Reconstruction";

pub fn encode_binary_stl(positions: &[f32], indices: &[u32]) -> Vec<u8> {
    let num_triangles = indices.len() / 3;
    let total_size = 84 + num_triangles * 50;
    let mut buf = vec![0u8; total_size];

    // --- Header (80 bytes) ---
    buf[..HEADER.len()].copy_from_slice(HEADER);
    // Remaining bytes (53..80) are already zero.

    // --- Triangle count (4 bytes, LE) ---
    let count_bytes = (num_triangles as u32).to_le_bytes();
    buf[80..84].copy_from_slice(&count_bytes);

    // --- Triangle records ---
    let mut offset = 84;

    for t in 0..num_triangles {
        let i0 = indices[t * 3] as usize;
        let i1 = indices[t * 3 + 1] as usize;
        let i2 = indices[t * 3 + 2] as usize;

        let v0x = positions[i0 * 3];
        let v0y = positions[i0 * 3 + 1];
        let v0z = positions[i0 * 3 + 2];

        let v1x = positions[i1 * 3];
        let v1y = positions[i1 * 3 + 1];
        let v1z = positions[i1 * 3 + 2];

        let v2x = positions[i2 * 3];
        let v2y = positions[i2 * 3 + 1];
        let v2z = positions[i2 * 3 + 2];

        // Face normal (cross product of edges, normalized)
        let e1x = v1x - v0x;
        let e1y = v1y - v0y;
        let e1z = v1z - v0z;
        let e2x = v2x - v0x;
        let e2y = v2y - v0y;
        let e2z = v2z - v0z;

        let mut nx = e1y * e2z - e1z * e2y;
        let mut ny = e1z * e2x - e1x * e2z;
        let mut nz = e1x * e2y - e1y * e2x;
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        if len > 0.0 {
            let inv = 1.0 / len;
            nx *= inv;
            ny *= inv;
            nz *= inv;
        }

        // Write normal (3× f32 LE)
        write_f32_le(&mut buf, offset, nx); offset += 4;
        write_f32_le(&mut buf, offset, ny); offset += 4;
        write_f32_le(&mut buf, offset, nz); offset += 4;

        // Write vertex 0
        write_f32_le(&mut buf, offset, v0x); offset += 4;
        write_f32_le(&mut buf, offset, v0y); offset += 4;
        write_f32_le(&mut buf, offset, v0z); offset += 4;

        // Write vertex 1
        write_f32_le(&mut buf, offset, v1x); offset += 4;
        write_f32_le(&mut buf, offset, v1y); offset += 4;
        write_f32_le(&mut buf, offset, v1z); offset += 4;

        // Write vertex 2
        write_f32_le(&mut buf, offset, v2x); offset += 4;
        write_f32_le(&mut buf, offset, v2y); offset += 4;
        write_f32_le(&mut buf, offset, v2z); offset += 4;

        // Attribute byte count (2 bytes, zero)
        // Already zero from vec initialization
        offset += 2;
    }

    buf
}

/// Write a single f32 in little-endian at the given offset.
#[inline(always)]
fn write_f32_le(buf: &mut [u8], offset: usize, val: f32) {
    let bytes = val.to_le_bytes();
    buf[offset..offset + 4].copy_from_slice(&bytes);
}
