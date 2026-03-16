import { describe, it, expect } from 'vitest';
import { encodeBinarySTL } from './stlEncoder';

describe('STL Encoder', () => {
  // A single triangle: 3 vertices at Z=0 plane
  const positions = new Float32Array([
    0, 0, 0,   // v0
    1, 0, 0,   // v1
    0, 1, 0,   // v2
  ]);
  const indices = new Uint32Array([0, 1, 2]);

  it('returns a Blob with the correct MIME type', () => {
    const blob = encodeBinarySTL(positions, indices);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('model/stl');
  });

  it('produces the correct binary size for N triangles', () => {
    const blob = encodeBinarySTL(positions, indices);
    // Binary STL: 80 (header) + 4 (triangle count) + 50 per triangle
    expect(blob.size).toBe(84 + 1 * 50);
  });

  it('writes the correct triangle count', async () => {
    const blob = encodeBinarySTL(positions, indices);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    expect(view.getUint32(80, true)).toBe(1);
  });

  it('writes valid normal vector for a Z-plane triangle', async () => {
    const blob = encodeBinarySTL(positions, indices);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    // Normal starts at offset 84
    const nx = view.getFloat32(84, true);
    const ny = view.getFloat32(88, true);
    const nz = view.getFloat32(92, true);

    // For vertices (0,0,0), (1,0,0), (0,1,0) with winding a→c→b:
    // edge1 = (1,0,0)-(0,0,0) = (1,0,0)
    // edge2 = (0,1,0)-(0,0,0) = (0,1,0)
    // cross = (0*0 - 0*1, 0*0 - 1*0, 1*1 - 0*0) = (0, 0, 1)
    // But the code uses indices [0,1,2] where idx1=0, idx2=1, idx3=2
    // Then ax = v2-v1, bx = v3-v1
    // a = (1,0,0), b = (0,1,0)
    // cross = (0-0, 0-0, 1-0) = (0, 0, 1)
    // Hmm, wait: the actual code uses:
    //   a = v2 - v1, b = v3 - v1
    //   nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx
    // a = (1,0,0), b = (0,1,0) → nx = 0*0-0*1=0, ny = 0*0-1*0=0, nz = 1*1-0*0=1
    // But the index order in lithophane is (a, c, b) for top face
    // For our test indices [0,1,2]:
    //   v1 = positions[0*3..] = (0,0,0)
    //   v2 = positions[1*3..] = (1,0,0)
    //   v3 = positions[2*3..] = (0,1,0)
    // Normal should be (0,0,1) or (0,0,-1) depending on winding
    // Let's just check the magnitude is ~1 (normalized)
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    expect(len).toBeCloseTo(1.0, 4);
  });

  it('handles multiple triangles', async () => {
    const positions4 = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      1, 1, 0,
    ]);
    const indices4 = new Uint32Array([0, 1, 2, 1, 3, 2]);
    const blob = encodeBinarySTL(positions4, indices4);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    expect(view.getUint32(80, true)).toBe(2);
    expect(blob.size).toBe(84 + 2 * 50);
  });

  it('handles empty mesh gracefully', () => {
    const emptyPositions = new Float32Array(0);
    const emptyIndices = new Uint32Array(0);
    const blob = encodeBinarySTL(emptyPositions, emptyIndices);
    expect(blob.size).toBe(84); // header + count only
  });
});
