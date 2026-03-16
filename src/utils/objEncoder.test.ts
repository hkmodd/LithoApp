import { describe, it, expect } from 'vitest';
import { encodeOBJ } from './objEncoder';

describe('OBJ Encoder', () => {
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]);
  const indices = new Uint32Array([0, 1, 2]);

  it('returns a Blob with text/plain MIME type', () => {
    const blob = encodeOBJ(positions, indices);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('includes the header comment', async () => {
    const blob = encodeOBJ(positions, indices);
    const text = await blob.text();
    expect(text).toContain('# LithoApp Generated OBJ');
  });

  it('outputs correct vertex lines', async () => {
    const blob = encodeOBJ(positions, indices);
    const text = await blob.text();

    expect(text).toContain('v 0.0000 0.0000 0.0000');
    expect(text).toContain('v 1.0000 0.0000 0.0000');
    expect(text).toContain('v 0.0000 1.0000 0.0000');
  });

  it('outputs 1-indexed face line (OBJ convention)', async () => {
    const blob = encodeOBJ(positions, indices);
    const text = await blob.text();

    // Indices [0,1,2] -> OBJ faces [1 2 3]
    expect(text).toContain('f 1 2 3');
  });

  it('outputs face lines with UVs when provided', async () => {
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1]);
    const blob = encodeOBJ(positions, indices, uvs);
    const text = await blob.text();

    expect(text).toContain('vt ');
    // Face format with UVs: f v/vt v/vt v/vt
    expect(text).toContain('f 1/1 2/2 3/3');
  });

  it('handles empty mesh without crashing', async () => {
    const blob = encodeOBJ(new Float32Array(0), new Uint32Array(0));
    const text = await blob.text();
    expect(text).toContain('# LithoApp Generated OBJ');
  });

  it('outputs multiple faces for a quad', async () => {
    const quadPositions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
    const quadIndices = new Uint32Array([0, 1, 2, 1, 3, 2]);
    const blob = encodeOBJ(quadPositions, quadIndices);
    const text = await blob.text();

    expect(text).toContain('f 1 2 3');
    expect(text).toContain('f 2 4 3');
  });
});
