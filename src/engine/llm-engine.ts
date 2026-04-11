/**
 * LLMEngine interface.
 *
 * The common contract that every inference backend must implement.
 * Current implementations: WebLLMAdapter (Phase 1), TransformersJsAdapter (Phase 2).
 */

import type { ChatMessage } from '../types';
import type { ProgressCallback } from './types';

export interface LLMEngine {
  /**
   * Load and initialise a model.
   * Downloads if not cached; reports progress via the callback.
   */
  initialize(modelId: string, onProgress?: ProgressCallback): Promise<void>;

  /**
   * Send a chat message and stream the response.
   */
  sendMessage(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void,
    options?: { temperature?: number; maxTokens?: number; topP?: number }
  ): Promise<void>;

  /** Stop the current token generation. */
  stopGeneration(): void;

  /** Unload the model and free memory. */
  unload(): Promise<void>;

  /** Whether the engine is currently streaming tokens. */
  isGenerating(): boolean;

  /** The currently loaded model ID, or null if none is loaded. */
  getCurrentModelId(): string | null;

  /** Whether a model is currently loaded and ready. */
  isModelLoaded(): boolean;
}
