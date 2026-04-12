/**
 * Markdown formatter — uses LLM to format raw text chunks into markdown.
 */

import type { ChatMessage } from '../../types';
import type { FormatterBackend } from './backend';
import { logger } from '../../logger';
import { generateId } from '../../types';

/**
 * Format a raw text chunk into well-structured markdown.
 * Uses the provided backend (local engine or cloud API) to perform the formatting.
 */
export async function formatChunkToMarkdown(
  chunk: string,
  backend: FormatterBackend,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const systemPrompt = `You are a text formatting assistant. Your task is to convert raw text into well-structured markdown.
Follow these rules:
1. Use appropriate heading levels (h1, h2, h3) for hierarchy
2. Use bullet points and numbered lists where appropriate
3. Format code blocks with triple backticks
4. Use bold and italic for emphasis
5. Preserve all meaningful content - do not omit or summarize
6. Add horizontal rules between major sections if appropriate
7. Keep tables in markdown format
8. Do not add any explanatory text - only output the formatted markdown`;

  const userPrompt = `Format the following text into well-structured markdown. Preserve all content:\n\n${chunk}`;

  const messages: ChatMessage[] = [
    {
      id: generateId(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    {
      id: generateId(),
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toISOString(),
    },
  ];

  const response = await backend.generate(messages, {
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 4096,
  });

  return response.trim();
}

/**
 * Format multiple chunks in parallel with concurrency limit.
 */
export async function formatChunksToMarkdown(
  chunks: string[],
  backend: FormatterBackend,
  options?: { temperature?: number; maxTokens?: number; concurrency?: number }
): Promise<string[]> {
  const concurrency = options?.concurrency ?? backend.recommendedConcurrency();
  const results: string[] = new Array(chunks.length);
  
  // Process in batches to avoid overwhelming the engine
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchPromises = batch.map(async (chunk, batchIndex) => {
      try {
        const formatted = await formatChunkToMarkdown(chunk, backend, options);
        return { index: i + batchIndex, content: formatted };
      } catch (err) {
        logger.error(`Error formatting chunk ${i + batchIndex}:`, err);
        // Return original chunk on error
        return { index: i + batchIndex, content: chunk };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      results[result.index] = result.content;
    }
  }

  return results;
}

/**
 * Format a chunk to markdown with timeout.
 */
export async function formatChunkWithTimeout(
  chunk: string,
  backend: FormatterBackend,
  timeoutMs: number = 30000,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  return Promise.race([
    formatChunkToMarkdown(chunk, backend, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Formatting timeout')), timeoutMs)
    ),
  ]);
}