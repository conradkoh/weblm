# WebLM

A self-contained web application that runs entirely in your browser — no installation, no server, no network required.

## Overview

WebLM is a local-first AI tool that transforms unstructured text into structured formats using on-device language models. It runs completely in the browser with no backend — all processing happens on your machine, and no data ever leaves your device.

## Features

- **Single zip distribution** — download one zip, extract, and open `index.html`
- **Zero installation** — no server, no dependencies, just a browser
- **Fully local** — all AI inference runs on-device via WebGPU / WASM
- **Offline capable** — works without internet after first model download
- **Text formatting** — transform unstructured reports into structured templates
- **Test mode** — seed sample data to try out formatting instantly
- **Chat interface** — conversational interaction with the local LLM

## Usage

### From Build

1. Run `pnpm build`
2. Grab `dist/weblm.zip` (~35 MB)
3. Extract the zip
4. Open `index.html` in a modern browser

### From Release

1. Download the latest `weblm.zip` from Releases
2. Extract and open `index.html`

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- [pnpm](https://pnpm.io) package manager
- Modern browser with WebGPU support (Chrome 121+, Edge 121+, Safari 18+)

### Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server with COOP/COEP headers |
| `pnpm build` | Build and package into `dist/weblm.zip` |
| `pnpm preview` | Preview production build locally |
| `pnpm typecheck` | Run Svelte/TypeScript type checking |
| `pnpm test` | Run test suite |
| `pnpm clean` | Remove build output |

### Development Notes

- The dev server enables COOP/COEP headers required for SharedArrayBuffer (WebLLM)
- Build uses `vite-plugin-singlefile` to inline assets into a single HTML, then zips all output files
- Model weights are cached in IndexedDB after first download
- Web Workers handle LLM inference off the main thread

## Project Structure

```
weblm/
├── index.html              # Entry HTML
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build config (singlefile + COOP/COEP)
├── public/
│   ├── favicon.svg         # Application favicon
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── scripts/
│   ├── dev.ts              # Dev server launcher
│   └── build.ts            # Production build + zip packaging
└── src/
    ├── main.ts             # Application entry point
    ├── App.svelte          # Root Svelte component
    ├── config.ts           # Model IDs and default settings
    ├── types.ts            # Shared app-wide types
    ├── settings.ts         # User settings
    ├── logger.ts           # Logging utilities
    ├── components/         # Svelte UI components
    │   ├── AppLauncher.svelte
    │   ├── ChatPage.svelte
    │   ├── FormatterPage.svelte
    │   ├── ChatMessage.svelte
    │   ├── ChatMessages.svelte
    │   ├── MessageInput.svelte
    │   ├── ModelSelector.svelte
    │   ├── SettingsPanel.svelte
    │   ├── StatusBar.svelte
    │   ├── Upload.svelte
    │   └── ...
    ├── stores/             # Svelte 5 reactive stores
    │   ├── appStore.svelte.ts
    │   ├── chatStore.svelte.ts
    │   ├── engineStore.svelte.ts
    │   ├── formatterStore.svelte.ts
    │   └── settingsStore.svelte.ts
    ├── engine/             # LLM engine abstraction
    │   ├── engine-factory.ts
    │   ├── llm-engine.ts
    │   ├── webllm-adapter.ts
    │   ├── transformers-adapter.ts
    │   ├── error-recovery.ts
    │   ├── progress-aggregator.ts
    │   └── webgpu-check.ts
    ├── lib/
    │   ├── formatter/      # Text formatting pipeline
    │   │   ├── chunker.ts
    │   │   ├── extractor.ts
    │   │   ├── refiner.ts
    │   │   ├── pipelineProcessor.ts
    │   │   ├── workerPool.ts
    │   │   ├── formatterWorker.ts
    │   │   ├── testData.ts
    │   │   └── ...
    │   ├── components/ui/  # shadcn-svelte UI primitives
    │   ├── highlight.ts    # Syntax highlighting
    │   ├── markdown.ts     # Markdown rendering
    │   └── utils.ts        # Utility functions
    ├── storage/            # IndexedDB persistence
    │   ├── idb.ts
    │   └── types.ts
    └── app/
        └── export.ts       # Export utilities
```

## Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev) + [Vite](https://vitejs.dev)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) + [shadcn-svelte](https://www.shadcn-svelte.com)
- **AI Runtime**: [WebLLM](https://webllm.mlc.ai) (WebGPU) + [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js) (WASM)
- **Language**: TypeScript
- **Build**: Bun + Vite + vite-plugin-singlefile
