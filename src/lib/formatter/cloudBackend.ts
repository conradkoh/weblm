/**
 * Cloud formatter backend.
 * Uses OpenAI-compatible REST API for formatter operations.
 * Supports concurrent requests for faster processing.
 */

import type { FormatterBackend, CloudApiConfig } from './backend';
import type { ChatMessage } from '../../types';
import { logger } from '../../logger';

/**
 * Cloud backend using OpenAI-compatible REST API.
 * Supports concurrent requests for parallel processing.
 */
export class CloudFormatterBackend implements FormatterBackend {
  private config: CloudApiConfig;

  /**
   * Create a cloud backend with the given configuration.
   */
  constructor(config: CloudApiConfig) {
    this.config = config;
  }

  /**
   * Generate text using the cloud API.
   * Calls POST /chat/completions with the messages.
   */
  async generate(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const baseUrl = this.config.apiUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const url = `${baseUrl}/chat/completions`;

    // Convert messages to OpenAI format
    const openaiMessages = messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    const body = {
      model: this.config.model,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
    };

    logger.debug(`CloudFormatterBackend.generate: calling ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error(`CloudFormatterBackend.generate: API error ${response.status}`, errorText);
      throw new Error(`Cloud API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      logger.warn('CloudFormatterBackend.generate: no content in response', data);
      throw new Error('No content in cloud API response');
    }

    logger.debug(`CloudFormatterBackend.generate: received ${content.length} chars`);
    return content.trim();
  }

  /**
   * Cloud APIs support concurrent requests.
   * Multiple parallel calls are typically well-handled.
   */
  supportsConcurrency(): boolean {
    return true;
  }

  /**
   * Recommend higher concurrency for cloud APIs.
   * 5 is a good balance between speed and API rate limits.
   */
  recommendedConcurrency(): number {
    return 5;
  }

  /**
   * This is a cloud backend.
   */
  type(): 'cloud' {
    return 'cloud';
  }
}