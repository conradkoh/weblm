/**
 * Development server script.
 *
 * Starts the Vite development server with COOP/COEP headers
 * enabled for SharedArrayBuffer support (required for WebLLM).
 *
 * Usage: bun run dev
 */

import { $ } from 'bun';

console.log('[weblm] Starting development server...');
await $`bunx vite`;