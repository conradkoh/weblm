/**
 * Engine module types.
 *
 * Type definitions for WebLLM integration, model lifecycle,
 * and inference operations.
 */

/**
 * Supported Gemma 4 model variants.
 */
export type ModelVariant = 'gemma-4-e2b' | 'gemma-4-e4b';

/**
 * Model loading state.
 */
export type ModelState =
  | 'unloaded'
  | 'loading'
  | 'ready'
  | 'error';

/**
 * Model loading progress information.
 */
export interface ModelProgress {
  /** Current loading phase */
  phase: 'downloading' | 'compiling' | 'ready';
  /** Progress percentage (0-100) */
  progress: number;
  /** Loaded bytes (if downloading) */
  loadedBytes?: number;
  /** Total bytes (if downloading) */
  totalBytes?: number;
  /** Human-readable status message */
  message: string;
}

/**
 * Engine configuration options.
 */
export interface EngineOptions {
  /** Model variant to load */
  model: ModelVariant;
  /** Temperature for generation */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Enable streaming output */
  stream?: boolean;
}

/**
 * Inference result (non-streaming).
 */
export interface InferenceResult {
  /** Generated text */
  text: string;
  /** Number of tokens generated */
  tokensGenerated: number;
  /** Inference duration in milliseconds */
  durationMs: number;
}

/**
 * Streaming token callback.
 */
export type StreamCallback = (token: string, done: boolean) => void;

export {};