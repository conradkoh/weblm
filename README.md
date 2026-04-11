# WebLM

A single, self-contained HTML file that runs entirely in your browser — no installation, no server, no network required.

## Overview

WebLM is designed as a single distributable webpage. Open the HTML file in any modern browser and everything runs locally on your device. There are no dependencies to install, no build steps to run, and no data ever leaves your machine.

## Goals

- **Single file distribution** — one `.html` file is all you need
- **Zero installation** — double-click to open in any browser
- **Fully local** — all processing happens on-device; nothing is sent to a server
- **Offline capable** — works without an internet connection after first load

## Usage

1. Download `index.html`
2. Open it in a modern web browser (Chrome, Firefox, Safari, Edge)
3. That's it

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.0 or later)
- Modern browser with WebGPU support (Chrome 121+, Edge 121+, Safari 18+)

### Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server with COOP/COEP headers |
| `bun run build` | Build single HTML file to `dist/` |
| `bun run preview` | Preview production build locally |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run clean` | Remove build output |

### Development Notes

- The dev server enables COOP/COEP headers required for WebLLM's SharedArrayBuffer usage
- Build output is a single HTML file with all assets inlined
- Model weights are cached in IndexedDB after first download

## Project Structure

```
weblm/
├── index.html              # Entry HTML
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build config (singlefile + COOP/COEP)
├── public/
│   └── favicon.svg        # Application favicon
├── scripts/
│   ├── dev.ts             # Dev server launcher (Bun)
│   └── build.ts           # Production build script (Bun)
└── src/
    ├── main.ts            # Application entry point
    ├── config.ts          # Model IDs and default settings
    ├── types.ts           # Shared app-wide types
    ├── engine/
    │   ├── index.ts       # Engine module public API
    │   ├── webgpu-check.ts# WebGPU capability detection
    │   └── types.ts       # Engine-related types
    ├── storage/
    │   ├── index.ts       # Storage module public API
    │   ├── idb.ts         # IndexedDB wrapper
    │   └── types.ts       # Storage-related types
    └── ui/
        ├── index.ts       # UI module public API
        ├── chat.ts         # Chat message list component
        ├── input.ts        # Message input component
        ├── progress.ts     # Model download progress
        ├── status.ts       # Status indicators
        └── styles.ts       # CSS-in-JS utilities
```
