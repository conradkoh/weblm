/**
 * Markdown formatter — uses LLM to format raw text chunks into markdown.
 */

import type { ChatMessage } from '../../types';
import { getEngineInstance } from '../../engine/engine-factory';
import { logger } from '../../logger';
import { generateId } from '../../types';

/**
 * Format a raw text chunk into well-structured markdown.
 * Uses the loaded LLM to perform the formatting.
 */
export async function formatChunkToMarkdown(
  chunk: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const engine = getEngineInstance();
  
  if (!engine.isModelLoaded()) {
    throw new Error('No model loaded. Please load a model first.');
  }

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

  return new Promise((resolve, reject) => {
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

    let fullResponse = '';

    engine.sendMessage(
      messages,
      (token) => {
        fullResponse += token;
      },
      (response) => {
        resolve(response.trim());
      },
      (error) => {
        logger.error('Markdown formatting error:', error);
        reject(error);
      },
      {
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 4096,
      }
    );
  });
}

/**
 * Format multiple chunks in parallel with concurrency limit.
 */
export async function formatChunksToMarkdown(
  chunks: string[],
  options?: { temperature?: number; maxTokens?: number; concurrency?: number }
): Promise<string[]> {
  const concurrency = options?.concurrency ?? 3;
  const results: string[] = new Array(chunks.length);
  
  // Process in batches to avoid overwhelming the engine
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchPromises = batch.map(async (chunk, batchIndex) => {
      try {
        const formatted = await formatChunkToMarkdown(chunk, options);
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
  timeoutMs: number = 30000
): Promise<string> {
  return Promise.race([
    formatChunkToMarkdown(chunk),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Formatting timeout')), timeoutMs)
    ),
  ]);
}