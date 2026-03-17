import { WorkerRequest, MeshEngineResult, WasmLithoModule, LithoParams, ProgressCallback, CMYWChannel, COLOR_CHANNELS } from './types';
import { generateExtrusion } from './extrusionEngine';
import { generateColorLitho } from './colorLithoEngine';

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
 * Normals are computed in Rust (area-weighted vertex normals) — pure WASM performance.
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
    normals: result.normals,
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
    // Load WASM engine (fast no-op after first call)
    const wasm = await loadWasm();

    switch (mode) {
      case 'lithophane': {
        const result = runLithophaneWasm(wasm, imageData, width, height, params, postProgress);
        postMeshResult(id, result);
        return;
      }
      case 'extrusion': {
        const result = generateExtrusion(imageData, width, height, params, postProgress, wasm);
        postMeshResult(id, result);
        return;
      }
      case 'color-litho': {
        // Generate 4 separate meshes (C, M, Y, W)
        const colorMeshSet = generateColorLitho(imageData, width, height, params, postProgress, wasm);

        // Collect all ArrayBuffers for transfer
        const transferables: Transferable[] = [];
        for (const ch of COLOR_CHANNELS) {
          const mesh = colorMeshSet[ch];
          transferables.push(
            mesh.positions.buffer as ArrayBuffer,
            mesh.indices.buffer as ArrayBuffer,
            mesh.normals.buffer as ArrayBuffer,
          );
          if (mesh.uvs) transferables.push(mesh.uvs.buffer as ArrayBuffer);
          if (mesh.thickness) transferables.push(mesh.thickness.buffer as ArrayBuffer);
        }

        self.postMessage(
          { type: 'color-complete', id, colorMeshSet },
          { transfer: transferables }
        );
        return;
      }
      case 'encode-stl': {
        // STL encoding runs entirely in WASM — zero main-thread blocking
        const stlPos = e.data.stlPositions!;
        const stlIdx = e.data.stlIndices!;
        const stlBuffer = wasm.encode_stl(stlPos, stlIdx);
        self.postMessage(
          { type: 'stl-complete', id, stlBuffer },
          { transfer: [stlBuffer.buffer as ArrayBuffer] }
        );
        return;
      }
      case 'encode-stl-pack': {
        // Encode all 4 CMYW channels as separate STL buffers, then ZIP
        const { zipSync } = await import('fflate');
        const pack = e.data.stlPack!;
        const zipEntries: Record<string, Uint8Array> = {};

        for (const ch of COLOR_CHANNELS) {
          const { positions, indices } = pack[ch];
          const stl = wasm.encode_stl(positions, indices);
          zipEntries[`${ch}.stl`] = stl;
        }

        const zipBuffer = zipSync(zipEntries, { level: 1 }); // fast compression
        self.postMessage(
          { type: 'stl-pack-complete', id, zipBuffer },
          { transfer: [zipBuffer.buffer as ArrayBuffer] }
        );
        return;
      }
      case 'cookie-cutter':
        throw new Error('Cookie Cutter mode not yet implemented');
      default:
        throw new Error(`Unknown generation mode: ${mode}`);
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred during mesh generation';
    self.postMessage({
      type: 'error',
      id,
      message
    });
  }
};

/** Helper to post a single mesh result with proper transferables */
function postMeshResult(id: number, result: MeshEngineResult) {
  const transferables: Transferable[] = [
    result.positions.buffer as ArrayBuffer,
    result.indices.buffer as ArrayBuffer,
    result.normals.buffer as ArrayBuffer,
  ];
  if (result.uvs) transferables.push(result.uvs.buffer as ArrayBuffer);
  if (result.thickness) transferables.push(result.thickness.buffer as ArrayBuffer);

  self.postMessage({
    type: 'complete',
    id,
    positions: result.positions,
    indices: result.indices,
    normals: result.normals,
    uvs: result.uvs,
    thickness: result.thickness,
    stats: result.stats
  }, { transfer: transferables });
}

