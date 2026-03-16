import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), wasm()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'litho-engine-wasm': path.resolve(__dirname, 'litho-engine-wasm/pkg'),
      },
    },
    worker: {
      format: 'es' as const,
      plugins: () => [wasm()],
    },
    optimizeDeps: {
      exclude: ['litho-engine-wasm'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
