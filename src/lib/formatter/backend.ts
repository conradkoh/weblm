/**
 * Formatter backend abstraction layer.
 * Allows formatter to use either local engine or cloud API.
 */

import type { ChatMessage } from '../../types';

/**
 * Backend for formatter LLM operations.
 * Abstracts away whether we're using local engine or cloud API.
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
   * Local engines typically don't; cloud APIs usually do.
   */
  supportsConcurrency(): boolean;

  /**
   * Recommended concurrency level for this backend.
   * Returns 1 for local (sequential), higher for cloud APIs.
   */
  recommendedConcurrency(): number;

  /**
   * Backend type identifier.
   * 'local' = uses WebLLM/transformers.js engine
   * 'cloud' = uses OpenAI-compatible REST API
   */
  type(): 'local' | 'cloud';
}

/**
 * Configuration for cloud API backend.
 */
export interface CloudApiConfig {
  /** Base URL for the API (e.g., "https://api.openai.com/v1") */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Model identifier (e.g., "gpt-4o-mini") */
  model: string;
}

/**
 * Create a backend based on type.
 */
export function createBackend(type: 'local' | 'cloud', config?: CloudApiConfig): FormatterBackend {
  if (type === 'cloud' && config) {
    const { CloudFormatterBackend } = require('./cloudBackend');
    return new CloudFormatterBackend(config);
  }
  const { LocalFormatterBackend } = require('./localBackend');
  return new LocalFormatterBackend();
}