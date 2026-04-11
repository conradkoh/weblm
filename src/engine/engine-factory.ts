/**
 * Engine factory — creates and manages the singleton LLMEngine instance.
 *
 * Supported runtimes:
 *   'webllm'          — @mlc-ai/web-llm (WebGPU)  ✅ implemented
 *   'transformers.js' — @huggingface/transformers  🔜 Phase 2
 */

import type { LLMEngine } from './llm-engine';
import { WebLLMAdapter } from './webllm-adapter';

export type Runtime = 'webllm' | 'transformers.js';

/**
 * Create a new LLMEngine for the given runtime.
 */
export function createEngine(runtime: Runtime): LLMEngine {
  switch (runtime) {
    case 'webllm':
      return new WebLLMAdapter();
    case 'transformers.js':
      throw new Error('Transformers.js runtime not yet implemented (coming in Phase 2)');
    default: {
      const _exhaustive: never = runtime;
      throw new Error(`Unknown runtime: ${_exhaustive}`);
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────

let _engine: LLMEngine | null = null;

/**
 * Get the current engine singleton.
 * Auto-creates a WebLLMAdapter on first call.
 */
export function getEngineInstance(): LLMEngine {
  if (!_engine) {
    _engine = createEngine('webllm');
  }
  return _engine;
}

/**
 * Replace the engine singleton (useful for switching runtimes).
 */
export function setEngineInstance(engine: LLMEngine): void {
  _engine = engine;
}
