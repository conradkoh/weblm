import { defineConfig } from 'vite';
import path from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $components: path.resolve('./src/lib/components'),
      $ui: path.resolve('./src/lib/components/ui'),
      '$utils.js': path.resolve('./src/lib/utils.ts'),
      $utils: path.resolve('./src/lib/utils.ts'),
      $hooks: path.resolve('./src/lib/hooks'),
    },
  },
  plugins: [tailwindcss(), svelte(), viteSingleFile()],
  server: {
    headers: {
      // Required for SharedArrayBuffer (WASM high-performance memory)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
