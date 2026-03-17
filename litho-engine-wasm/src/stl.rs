/// Binary STL encoder — runs entirely in WASM for zero main-thread blocking.
///
/// Binary STL format:
/// - 80 bytes header
/// - 4 bytes u32 triangle count (little-endian)
/// - For each triangle (50 bytes):
///   - 12 bytes: face normal (3× f32 LE)
///   - 36 bytes: 3 vertices (9× f32 LE)
///   - 2 bytes: attribute byte count (0)

const HEADER: &[u8; 54] = b"LithoApp Generated STL - Neural Surface Reconstruction";

pub fn encode_binary_stl(positions: &[f32], indices: &[u32]) -> Vec<u8> {
    let num_triangles = indices.len() / 3;
    let total_size = 84 + num_triangles * 50;
    let mut buf = vec![0u8; total_size];

    // --- Header (80 bytes) ---
    buf[..HEADER.len()].copy_from_slice(HEADER);
    // Remaining bytes (54..80) already zero.

    // --- Triangle count (4 bytes, LE) ---
    buf[80..84].copy_from_slice(&(num_triangles as u32).to_le_bytes());

    // --- Triangle records ---
    let mut offset = 84;

    for tri in indices.chunks_exact(3) {
        let i0 = tri[0] as usize;
        let i1 = tri[1] as usize;
        let i2 = tri[2] as usize;

        let (i03, i13, i23) = (i0 * 3, i1 * 3, i2 * 3);

        let v0x = positions[i03];
        let v0y = positions[i03 + 1];
        let v0z = positions[i03 + 2];

        let v1x = positions[i13];
        let v1y = positions[i13 + 1];
        let v1z = positions[i13 + 2];

        let v2x = positions[i23];
        let v2y = positions[i23 + 1];
        let v2z = positions[i23 + 2];

        // Face normal (cross product, normalized)
        let e1x = v1x - v0x;
        let e1y = v1y - v0y;
        let e1z = v1z - v0z;
        let e2x = v2x - v0x;
        let e2y = v2y - v0y;
        let e2z = v2z - v0z;

        let mut nx = e1y * e2z - e1z * e2y;
        let mut ny = e1z * e2x - e1x * e2z;
        let mut nz = e1x * e2y - e1y * e2x;
        let len_sq = nx * nx + ny * ny + nz * nz;
        if len_sq > 0.0 {
            let inv = 1.0 / len_sq.sqrt();
            nx *= inv;
            ny *= inv;
            nz *= inv;
        }

        // Write 12 f32 values: normal + 3 vertices
        write_f32_le(&mut buf, offset, nx);      offset += 4;
        write_f32_le(&mut buf, offset, ny);      offset += 4;
        write_f32_le(&mut buf, offset, nz);      offset += 4;

        write_f32_le(&mut buf, offset, v0x);     offset += 4;
        write_f32_le(&mut buf, offset, v0y);     offset += 4;
        write_f32_le(&mut buf, offset, v0z);     offset += 4;

        write_f32_le(&mut buf, offset, v1x);     offset += 4;
        write_f32_le(&mut buf, offset, v1y);     offset += 4;
        write_f32_le(&mut buf, offset, v1z);     offset += 4;

        write_f32_le(&mut buf, offset, v2x);     offset += 4;
        write_f32_le(&mut buf, offset, v2y);     offset += 4;
        write_f32_le(&mut buf, offset, v2z);     offset += 4;

        // Attribute byte count (2 bytes, zero) — already zero
        offset += 2;
    }

    buf
}

#[inline(always)]
fn write_f32_le(buf: &mut [u8], offset: usize, val: f32) {
    buf[offset..offset + 4].copy_from_slice(&val.to_le_bytes());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stl_header_and_size() {
        let positions: Vec<f32> = vec![
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
        ];
        let indices: Vec<u32> = vec![0, 1, 2];
        let stl = encode_binary_stl(&positions, &indices);
        // 1 triangle → 84 + 50 = 134 bytes
        assert_eq!(stl.len(), 134);
        // Header starts with "LithoApp"
        assert!(stl[..8].starts_with(b"LithoApp"));
        // Triangle count
        let count = u32::from_le_bytes([stl[80], stl[81], stl[82], stl[83]]);
        assert_eq!(count, 1);
    }

    #[test]
    fn stl_normal_is_unit() {
        let positions: Vec<f32> = vec![
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
        ];
        let indices: Vec<u32> = vec![0, 1, 2];
        let stl = encode_binary_stl(&positions, &indices);
        // Normal at offset 84
        let nx = f32::from_le_bytes([stl[84], stl[85], stl[86], stl[87]]);
        let ny = f32::from_le_bytes([stl[88], stl[89], stl[90], stl[91]]);
        let nz = f32::from_le_bytes([stl[92], stl[93], stl[94], stl[95]]);
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        assert!((len - 1.0).abs() < 1e-5, "STL normal not unit length: {}", len);
    }

    #[test]
    fn stl_vertices_round_trip() {
        let positions: Vec<f32> = vec![
            1.5, 2.5, 3.5,
            4.5, 5.5, 6.5,
            7.5, 8.5, 9.5,
        ];
        let indices: Vec<u32> = vec![0, 1, 2];
        let stl = encode_binary_stl(&positions, &indices);
        // Vertex 0 starts at offset 96 (after 12 bytes of normal)
        let v0x = f32::from_le_bytes([stl[96], stl[97], stl[98], stl[99]]);
        assert!((v0x - 1.5).abs() < 1e-5);
        let v0y = f32::from_le_bytes([stl[100], stl[101], stl[102], stl[103]]);
        assert!((v0y - 2.5).abs() < 1e-5);
    }

    #[test]
    fn stl_multiple_triangles() {
        let positions: Vec<f32> = vec![
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
        ];
        let indices: Vec<u32> = vec![0, 1, 2, 0, 2, 3];
        let stl = encode_binary_stl(&positions, &indices);
        assert_eq!(stl.len(), 84 + 2 * 50); // 2 triangles
        let count = u32::from_le_bytes([stl[80], stl[81], stl[82], stl[83]]);
        assert_eq!(count, 2);
    }
}
