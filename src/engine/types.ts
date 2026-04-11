/**
 * Engine module types.
 *
 * Type definitions for WebLLM integration, model lifecycle,
 * and inference operations.
 */

/**
 * Model ID type — a plain string (WebLLM model_id).
 */
export type ModelVariant = string;

/**
 * Model loading state.
 */
export type ModelState =
  | 'unloaded'
  | 'checking'
  | 'loading'
  | 'ready'
  | 'error';

/**
 * Model loading progress information.
 * This wraps WebLLM's InitProgressReport.
 */
export interface ModelProgress {
  /** Current loading phase */
  phase: 'downloading' | 'compiling' | 'loading' | 'ready';
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
  /** Time elapsed in seconds */
  timeElapsed?: number;
}

/**
 * Progress callback for model loading.
 */
export type ProgressCallback = (progress: ModelProgress) => void;

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