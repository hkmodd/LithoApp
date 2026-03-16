import { WorkerRequest, MeshEngineResult, WasmLithoModule, LithoParams, ProgressCallback } from './types';
import { generateExtrusion } from './extrusionEngine';
import { computeVertexNormals } from './computeNormals';

// --- WASM engine (loaded lazily, required) ---
let wasmModule: WasmLithoModule | null = null;

async function loadWasm(): Promise<WasmLithoModule> {
  if (wasmModule) return wasmModule;
  const wasm = await import('litho-engine-wasm/litho_engine_wasm.js');
  await wasm.default();
  wasmModule = wasm as unknown as WasmLithoModule;
  console.log('[LithoApp] WASM engine loaded successfully');
  return wasmModule;
}

/**
 * Run the lithophane pipeline via WASM.
 */
function runLithophaneWasm(
  wasm: WasmLithoModule,
  imageData: ImageData,
  width: number,
  height: number,
  params: LithoParams,
  postProgress: ProgressCallback
): MeshEngineResult {
  const result = wasm.generate_lithophane(
    imageData.data,
    width,
    height,
    params,
    postProgress
  );
  return {
    positions: result.positions,
    indices: result.indices,
    normals: new Float32Array(0), // computed by worker after engine returns
    uvs: result.uvs,
    stats: result.stats,
  };
}

// Main WebWorker entry point
self.onmessage = async function (e: MessageEvent<WorkerRequest>) {
  const { id, mode, imageData, width, height, params } = e.data;

  const postProgress = (progress: number, message: string) => {
    self.postMessage({ type: 'progress', id, progress, message });
  };

  try {
    let result: MeshEngineResult;

    // Load WASM engine (fast no-op after first call)
    const wasm = await loadWasm();

    switch (mode) {
      case 'lithophane':
        result = runLithophaneWasm(wasm, imageData, width, height, params, postProgress);
        break;
      case 'extrusion':
        result = generateExtrusion(imageData, width, height, params, postProgress, wasm);
        break;
      case 'cookie-cutter':
        throw new Error('Cookie Cutter mode not yet implemented');
      default:
        throw new Error(`Unknown generation mode: ${mode}`);
    }

    // Compute vertex normals off the main thread to avoid UI freeze
    const normals = computeVertexNormals(result.positions, result.indices);

    const transferables: Transferable[] = [
      result.positions.buffer as ArrayBuffer,
      result.indices.buffer as ArrayBuffer,
      normals.buffer as ArrayBuffer,
    ];
    if (result.uvs) {
      transferables.push(result.uvs.buffer as ArrayBuffer);
    }
    if (result.thickness) {
      transferables.push(result.thickness.buffer as ArrayBuffer);
    }

    self.postMessage({
      type: 'complete',
      id,
      positions: result.positions,
      indices: result.indices,
      normals: normals,
      uvs: result.uvs,
      thickness: result.thickness,
      stats: result.stats
    }, { transfer: transferables });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred during mesh generation';
    self.postMessage({
      type: 'error',
      id,
      message
    });
  }
};

