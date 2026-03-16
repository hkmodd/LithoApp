/**
 * Vite config for single-file HTML build.
 * Inlines all JS, CSS, and assets into a single index.html.
 *
 * Usage: npm run build:single
 * Output: dist-single/index.html
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss(), wasm(), viteSingleFile()],
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
  build: {
    outDir: 'dist-single',
    assetsInlineLimit: 100000000, // Inline everything
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined, // No code-splitting — everything in one bundle
      },
    },
  },
});
