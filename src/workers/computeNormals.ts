/**
 * Compute per-vertex normals from positions and indices (area-weighted).
 * Equivalent to Three.js BufferGeometry.computeVertexNormals() but runs
 * off the main thread (in the Web Worker).
 */
export function computeVertexNormals(
  positions: Float32Array,
  indices: Uint32Array
): Float32Array {
  const vertexCount = positions.length / 3;
  const normals = new Float32Array(vertexCount * 3); // initialized to 0

  // Accumulate face normals (area-weighted) onto each vertex
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i];
    const ib = indices[i + 1];
    const ic = indices[i + 2];

    const ax = positions[ia * 3], ay = positions[ia * 3 + 1], az = positions[ia * 3 + 2];
    const bx = positions[ib * 3], by = positions[ib * 3 + 1], bz = positions[ib * 3 + 2];
    const cx = positions[ic * 3], cy = positions[ic * 3 + 1], cz = positions[ic * 3 + 2];

    // Edge vectors
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;

    // Cross product (area-weighted normal)
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    // Accumulate onto each vertex of the face
    normals[ia * 3]     += nx; normals[ia * 3 + 1] += ny; normals[ia * 3 + 2] += nz;
    normals[ib * 3]     += nx; normals[ib * 3 + 1] += ny; normals[ib * 3 + 2] += nz;
    normals[ic * 3]     += nx; normals[ic * 3 + 1] += ny; normals[ic * 3 + 2] += nz;
  }

  // Normalize each vertex normal to unit length
  for (let i = 0; i < vertexCount; i++) {
    const ox = i * 3;
    const x = normals[ox], y = normals[ox + 1], z = normals[ox + 2];
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len > 1e-8) {
      normals[ox]     = x / len;
      normals[ox + 1] = y / len;
      normals[ox + 2] = z / len;
    }
  }

  return normals;
}
