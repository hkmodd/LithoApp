declare module 'litho-engine-wasm/litho_engine_wasm.js' {
  /**
   * Main WASM lithophane generation entry point.
   * @param pixels   Raw RGBA pixel data (Uint8Array / Uint8ClampedArray)
   * @param width    Original image width
   * @param height   Original image height
   * @param params   LithoParams object (serde-deserialized in WASM)
   * @param progressFn Callback `(progress: number, message: string) => void`
   * @returns `{ positions: Float32Array, indices: Uint32Array, uvs: Float32Array, stats: object }`
   */
  export function generate_lithophane(
    pixels: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    params: Record<string, unknown>,
    progressFn: (progress: number, message: string) => void
  ): {
    positions: Float32Array;
    indices: Uint32Array;
    uvs: Float32Array;
    stats: {
      vertices: number;
      triangles: number;
      width: number;
      height: number;
      bbox: {
        minX: number; maxX: number;
        minY: number; maxY: number;
        minZ: number; maxZ: number;
      };
    };
  };

  /** Synchronous init from a compiled WebAssembly.Module */
  export function initSync(module: WebAssembly.Module | BufferSource): void;

  /** Async init — fetches and compiles the .wasm file */
  export default function init(module_or_path?: RequestInfo | URL | Response | BufferSource): Promise<void>;
}
