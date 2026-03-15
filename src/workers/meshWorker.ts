import { WorkerMessage, MeshEngineResult } from './types';
import { generateLithophane } from './lithophaneEngine';
import { generateExtrusion } from './extrusionEngine';

// Main WebWorker entry point
self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const { mode, imageData, width, height, params } = e.data;

  const postProgress = (progress: number, message: string) => {
    (self as any).postMessage({ type: 'progress', progress, message });
  };

  try {
    let result: MeshEngineResult;

    switch (mode) {
      case 'lithophane':
        result = generateLithophane(imageData, width, height, params, postProgress);
        break;
      case 'extrusion':
        result = generateExtrusion(imageData, width, height, params, postProgress);
        break;
      case 'cookie-cutter':
        // Placeholder for future Cookie Cutter generation
        throw new Error('Cookie Cutter mode not yet implemented');
      default:
        throw new Error(`Unknown generation mode: ${mode}`);
    }

    const transferables: Transferable[] = [result.positions.buffer, result.indices.buffer];
    if (result.uvs) {
      transferables.push(result.uvs.buffer);
    }

    (self as any).postMessage({
      type: 'complete',
      positions: result.positions,
      indices: result.indices,
      uvs: result.uvs,
      stats: result.stats
    }, transferables);

  } catch (error: any) {
    (self as any).postMessage({
      type: 'error',
      message: error.message || 'An error occurred during mesh generation'
    });
  }
};
