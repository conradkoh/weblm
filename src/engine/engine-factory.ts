/**
 * Engine factory — creates and manages the singleton LLMEngine instance.
 *
 * Supported runtimes:
 *   'webllm'          — @mlc-ai/web-llm (WebGPU)         ✅ Phase 1
 *   'transformers.js' — @huggingface/transformers (ONNX)  ✅ Phase 2
 */

import type { LLMEngine } from './llm-engine';
import { WebLLMAdapter } from './webllm-adapter';
import { TransformersJsAdapter } from './transformers-adapter';
import { TRANSFORMERS_MODEL_IDS } from './transformers-models';

export type Runtime = 'webllm' | 'transformers.js';

/**
 * Determine the correct runtime for a given modelId.
 */
export function getRuntimeForModel(modelId: string): Runtime {
  return TRANSFORMERS_MODEL_IDS.has(modelId) ? 'transformers.js' : 'webllm';
}

/**
 * Create a new LLMEngine for the given runtime.
 */
export function createEngine(runtime: Runtime): LLMEngine {
  switch (runtime) {
    case 'webllm':
      return new WebLLMAdapter();
    case 'transformers.js':
      return new TransformersJsAdapter();
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

/**
 * Auto-detect runtime from modelId, create the right engine, and set it as the singleton.
 * Call this before initializeEngine to ensure the right backend is active.
 */
export function switchRuntimeForModel(modelId: string): void {
  const runtime = getRuntimeForModel(modelId);
  const current = _engine;

  // Only replace if we need a different runtime type
  if (
    (runtime === 'webllm' && current instanceof WebLLMAdapter) ||
    (runtime === 'transformers.js' && current instanceof TransformersJsAdapter)
  ) {
    return; // Already the right runtime
  }

  _engine = createEngine(runtime);
}
