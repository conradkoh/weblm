/**
 * Production build script.
 *
 * Builds the application as a single HTML file using Vite
 * with the vite-plugin-singlefile plugin for bundling all
 * assets inline.
 *
 * Usage: bun run build
 */

import { $ } from 'bun';

console.log('[weblm] Building production bundle...');
await $`bunx vite build`;
console.log('[weblm] Build complete! Output in dist/');