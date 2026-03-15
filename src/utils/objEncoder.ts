export function encodeOBJ(positions: Float32Array, indices: Uint32Array, uvs?: Float32Array): Blob {
  const chunks: string[] = [];
  chunks.push('# LithoApp Generated OBJ\n');

  // Chunk size for joining to avoid massive strings in memory
  const CHUNK_SIZE = 10000;

  // Write vertices
  let currentChunk = '';
  for (let i = 0; i < positions.length; i += 3) {
    currentChunk += `v ${positions[i].toFixed(4)} ${positions[i + 1].toFixed(4)} ${positions[i + 2].toFixed(4)}\n`;
    if (i % (CHUNK_SIZE * 3) === 0) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  // Write UVs if available
  if (uvs && uvs.length > 0) {
    currentChunk = '';
    for (let i = 0; i < uvs.length; i += 2) {
      currentChunk += `vt ${uvs[i].toFixed(4)} ${uvs[i + 1].toFixed(4)}\n`;
      if (i % (CHUNK_SIZE * 2) === 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    if (currentChunk) chunks.push(currentChunk);
  }

  // Write faces
  currentChunk = '';
  const hasUvs = uvs && uvs.length > 0;
  for (let i = 0; i < indices.length; i += 3) {
    const v1 = indices[i] + 1;
    const v2 = indices[i + 1] + 1;
    const v3 = indices[i + 2] + 1;

    if (hasUvs) {
      currentChunk += `f ${v1}/${v1} ${v2}/${v2} ${v3}/${v3}\n`;
    } else {
      currentChunk += `f ${v1} ${v2} ${v3}\n`;
    }

    if (i % (CHUNK_SIZE * 3) === 0) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return new Blob(chunks, { type: 'text/plain' });
}
