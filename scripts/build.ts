/**
 * Production build script.
 *
 * Builds the application as a single HTML file using Vite
 * with the vite-plugin-singlefile plugin for bundling all
 * assets inline, then packages the output into a zip file.
 *
 * Usage: bun run build
 */

import { $ } from 'bun';
import { statSync } from 'node:fs';
import { readdirSync } from 'node:fs';

console.log('[weblm] Building production bundle...');
await $`bunx vite build`;

console.log('[weblm] Creating zip archive...');
// Get list of files in dist/ (excluding any existing zip)
const distFiles = readdirSync('dist').filter(f => !f.endsWith('.zip'));

if (distFiles.length === 0) {
  console.error('[weblm] Error: No files found in dist/');
  process.exit(1);
}

console.log(`[weblm] Zipping ${distFiles.length} files: ${distFiles.join(', ')}`);

// Create zip by running from dist directory and adding all files
// Use --namescot to handle any special characters in filenames
for (const file of distFiles) {
  await $`cd dist && zip -g ../dist/weblm.zip ${file}`;
}

// Get zip size for logging
const zipStats = statSync('dist/weblm.zip');
const zipSizeMB = (zipStats.size / (1024 * 1024)).toFixed(2);
console.log('[weblm] Build complete!');
console.log(`[weblm] Output: dist/weblm.zip (${zipSizeMB} MB)`);
console.log('[weblm] Download this zip, extract, and open index.html to run the app');
