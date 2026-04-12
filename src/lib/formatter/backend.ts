/**
 * Formatter backend abstraction layer.
 * Allows formatter to use either local engine or worker pool.
 */

import type { ChatMessage } from '../../types';

/**
 * Backend for formatter LLM operations.
 * Abstracts away whether we're using local engine or worker pool.
 */
export interface FormatterBackend {
  /**
   * Generate a response from messages.
   * @param messages - Array of chat messages (system, user, assistant)
   * @param options - Optional generation parameters
   * @returns The generated text response
   */
  generate(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;

  /**
   * Whether this backend supports concurrent requests.
   * Local engines typically don't; worker pools usually do.
   */
  supportsConcurrency(): boolean;

  /**
   * Recommended concurrency level for this backend.
   * Returns 1 for local (sequential), higher for concurrent backends.
   */
  recommendedConcurrency(): number;

  /**
   * Backend type identifier.
   * 'local' = uses WebLLM/transformers.js engine
   * 'worker' = uses Web Worker pool with Transformers.js in WASM mode
   */
  type(): 'local' | 'worker';
}