/**
 * Local formatter backend.
 * Wraps the current WebLLM/transformers.js engine for formatter operations.
 */

import type { FormatterBackend } from './backend';
import type { ChatMessage } from '../../types';
import { getEngineInstance } from '../../engine/engine-factory';
import { logger } from '../../logger';

/**
 * Local backend using the browser's local AI engine.
 * Does NOT support concurrent requests - processes one at a time.
 */
export class LocalFormatterBackend implements FormatterBackend {
  /**
   * Generate text using the local engine.
   * Wraps engine.sendMessage() in a Promise for easier async/await usage.
   */
  async generate(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const engine = getEngineInstance();

    if (!engine.isModelLoaded()) {
      throw new Error('No model loaded. Please load a model first.');
    }

    return new Promise((resolve, reject) => {
      let fullResponse = '';

      engine.sendMessage(
        messages,
        (token) => {
          // Collect tokens for streaming (even though we don't display them)
          fullResponse += token;
        },
        (response) => {
          logger.debug(`LocalFormatterBackend.generate: received ${response.length} chars`);
          resolve(response.trim());
        },
        (error) => {
          logger.error('LocalFormatterBackend.generate error:', error);
          reject(error);
        },
        {
          temperature: options?.temperature ?? 0.3,
          maxTokens: options?.maxTokens ?? 2048,
        }
      );
    });
  }

  /**
   * Local engines do NOT support concurrent requests.
   * The WebLLM engine has a single-generation lock.
   */
  supportsConcurrency(): boolean {
    return false;
  }

  /**
   * Recommend sequential processing (concurrency = 1) for local engines.
   */
  recommendedConcurrency(): number {
    return 1;
  }

  /**
   * This is a local backend.
   */
  type(): 'local' {
    return 'local';
  }
}