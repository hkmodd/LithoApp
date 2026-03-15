export function encodeBinarySTL(positions: Float32Array, indices: Uint32Array): Blob {
  const numTriangles = indices.length / 3;
  const buffer = new ArrayBuffer(84 + numTriangles * 50);
  const view = new DataView(buffer);

  // Header (80 bytes)
  const encoder = new TextEncoder();
  const header = encoder.encode("LithoApp Generated STL - Neural Surface Reconstruction");
  for (let i = 0; i < header.length && i < 80; i++) {
    view.setUint8(i, header[i]);
  }

  // Number of triangles (4 bytes)
  view.setUint32(80, numTriangles, true); // little endian

  let offset = 84;
  const p = positions;

  for (let i = 0; i < numTriangles; i++) {
    const idx1 = indices[i * 3] * 3;
    const idx2 = indices[i * 3 + 1] * 3;
    const idx3 = indices[i * 3 + 2] * 3;

    const v1x = p[idx1], v1y = p[idx1 + 1], v1z = p[idx1 + 2];
    const v2x = p[idx2], v2y = p[idx2 + 1], v2z = p[idx2 + 2];
    const v3x = p[idx3], v3y = p[idx3 + 1], v3z = p[idx3 + 2];

    // Normal calculation (cross product)
    const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
    const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len; ny /= len; nz /= len;
    }

    // Write normal
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    // Write vertices
    view.setFloat32(offset, v1x, true); offset += 4;
    view.setFloat32(offset, v1y, true); offset += 4;
    view.setFloat32(offset, v1z, true); offset += 4;

    view.setFloat32(offset, v2x, true); offset += 4;
    view.setFloat32(offset, v2y, true); offset += 4;
    view.setFloat32(offset, v2z, true); offset += 4;

    view.setFloat32(offset, v3x, true); offset += 4;
    view.setFloat32(offset, v3y, true); offset += 4;
    view.setFloat32(offset, v3z, true); offset += 4;

    // Attribute byte count
    view.setUint16(offset, 0, true); offset += 2;
  }

  return new Blob([buffer], { type: 'model/stl' });
}
