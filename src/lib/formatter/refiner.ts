/**
 * Refiner — creates refined chunks based on cohesion analysis.
 */

import type { ChatMessage } from '../../types';
import type { FormatterBackend } from './backend';
import type { CohesionAnalysis } from './cohesionAnalyzer';
import { estimateTokenCount, getDefaultChunkSize } from './tokenizer';
import { logger } from '../../logger';
import { generateId } from '../../types';

// Conservative limit for local models - avoids context overflow
const SAFE_CONTEXT_LIMIT = 8000;

export interface RefinementResult {
  refinedChunks: string[];
  success: boolean;
  error?: string;
}

/**
 * Estimate total tokens for a set of messages.
 */
function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
}

/**
 * Process a single refinement batch.
 */
async function processRefinementBatch(
  chunks: string[],
  analyses: CohesionAnalysis[],
  startIdx: number,
  endIdx: number,
  backend: FormatterBackend,
  options?: { onToken?: (token: string) => void }
): Promise<{ refined: string[]; success: boolean }> {
  const batchChunks = chunks.slice(startIdx, endIdx);
  const batchAnalyses = analyses.slice(startIdx, Math.min(endIdx, analyses.length));

  // Collect issues for this batch
  const issueSummary = batchAnalyses
    .map((a, i) => {
      const globalIdx = startIdx + i;
      if (!a.hasIssues || a.issues.length === 0) return null;
      return `Between chunk ${globalIdx + 1} and ${globalIdx + 2}: ${a.issues.map(issue => `${issue.type}: ${issue.description}`).join('; ')}`;
    })
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `You are a content refinement assistant. Your task is to improve text chunks to address cohesion issues.
Rules:
1. Each refined chunk must be ≤ 1/3 of the model's context window (approximately ${Math.floor(getDefaultChunkSize() / 4)} tokens as characters)
2. Add transition sentences between chunks where needed
3. Remove duplicate content
4. Add missing context explanations where necessary
5. Preserve all unique information
6. Maintain consistent tone and style
7. Output only the refined chunks, one per line, separated by "---CHUNK_SEPARATOR---"`;

  const userPrompt = `Refine these text chunks to address the following cohesion issues:

${issueSummary || 'No specific issues found, but ensure all chunks are well-formed.'}

--- ORIGINAL CHUNKS ---
${batchChunks.map((c, i) => `Chunk ${i + 1}:
${c}`).join('\n\n')}

Output the refined chunks separated by "---CHUNK_SEPARATOR---" (no other text):`;

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

  // Safety check: if batch itself exceeds limit, process one at a time
  const totalTokens = estimateMessagesTokens(messages);
  if (totalTokens > SAFE_CONTEXT_LIMIT) {
    logger.warn(`Refiner: Batch ${startIdx}-${endIdx} exceeds limit (${totalTokens} tokens), processing individually`);
    const results: string[] = [];
    for (let i = 0; i < batchChunks.length; i++) {
      const chunkIdx = startIdx + i;
      const result = await processSingleChunk(
        batchChunks[i]!,
        batchAnalyses[i] ?? null,
        chunkIdx,
        backend,
        options
      );
      results.push(result);
    }
    return { refined: results, success: true };
  }

  try {
    const response = await backend.generate(messages, {
      temperature: 0.5,
      maxTokens: 4096,
      onToken: options?.onToken,
    });
    // Split by chunk separator
    const refined = response
      .split(/---CHUNK_SEPARATOR---/)
      .map(c => c.trim())
      .filter(c => c.length > 0);

    // Validate that refined chunks are within size limits
    const maxChars = getDefaultChunkSize() * 4;
    const validChunks = refined.filter(c => {
      const tokens = estimateTokenCount(c);
      return tokens <= getDefaultChunkSize();
    });

    return {
      refined: validChunks.length > 0 ? validChunks : refined,
      success: true,
    };
  } catch (err) {
    logger.error(`Error processing refinement batch ${startIdx}-${endIdx}:`, err);
    return { refined: batchChunks, success: false };
  }
}

/**
 * Process a single chunk individually (fallback for oversized input).
 */
async function processSingleChunk(
  chunk: string,
  analysis: CohesionAnalysis | null,
  chunkIndex: number,
  backend: FormatterBackend,
  options?: { onToken?: (token: string) => void }
): Promise<string> {
  const issueText = analysis?.hasIssues && analysis.issues.length > 0
    ? `Issue between this chunk and the next: ${analysis.issues.map(i => `${i.type}: ${i.description}`).join('; ')}`
    : 'No specific cohesion issues for this chunk.';

  const systemPrompt = `You are a content refinement assistant. Your task is to improve a text chunk.
Rules:
1. The refined chunk must be ≤ 1/3 of the model's context window (approximately ${Math.floor(getDefaultChunkSize() / 4)} tokens as characters)
2. Add transition sentences where needed
3. Remove duplicate content
4. Preserve all unique information
5. Maintain consistent tone and style
6. Output only the refined chunk text, no separators or markers.`;

  const userPrompt = `Refine this text chunk:

--- ORIGINAL CHUNK ---
${chunk}

Cohesion issue note: ${issueText}

Output only the refined chunk (no markers or separators):`;

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

  try {
    const response = await backend.generate(messages, {
      temperature: 0.5,
      maxTokens: 2048,
      onToken: options?.onToken,
    });

    // Validate size
    const tokens = estimateTokenCount(response);
    if (tokens <= getDefaultChunkSize()) {
      return response.trim();
    }
    // If still too large, truncate to max size
    logger.warn(`Refiner: Single chunk ${chunkIndex} still exceeds limit after refinement, truncating`);
    const maxChars = getDefaultChunkSize() * 4;
    return response.slice(0, maxChars).trim();
  } catch (err) {
    logger.error(`Error processing single chunk ${chunkIndex}:`, err);
    return chunk;
  }
}

/**
 * Refine chunks based on cohesion analysis.
 * Processes chunks in batches to avoid context window overflow.
 */
export async function refineChunks(
  chunks: string[],
  analyses: CohesionAnalysis[],
  backend: FormatterBackend,
  options?: { onToken?: (token: string) => void; contextWindowSize?: number }
): Promise<RefinementResult> {
  // Check if any refinement is needed
  const needsRefinement = analyses.some(a => a.hasIssues && a.issues.length > 0);
  
  if (!needsRefinement || chunks.length === 0) {
    return {
      refinedChunks: chunks,
      success: true,
    };
  }

  // Use provided context window size or conservative default
  const contextLimit = options?.contextWindowSize ?? SAFE_CONTEXT_LIMIT;

  // Calculate total input size
  const issueSummary = analyses
    .map((a, i) => {
      if (!a.hasIssues || a.issues.length === 0) return null;
      return `Between chunk ${i} and ${i + 1}: ${a.issues.map(issue => `${issue.type}: ${issue.description}`).join('; ')}`;
    })
    .filter(Boolean)
    .join('\n');

  const systemPromptBase = `You are a content refinement assistant. Your task is to improve text chunks to address cohesion issues.
Rules:
1. Each refined chunk must be ≤ 1/3 of the model's context window (approximately ${Math.floor(getDefaultChunkSize() / 4)} tokens as characters)
2. Add transition sentences between chunks where needed
3. Remove duplicate content
4. Add missing context explanations where necessary
5. Preserve all unique information
6. Maintain consistent tone and style
7. Output only the refined chunks, one per line, separated by "---CHUNK_SEPARATOR---"`;
  
  // Estimate overhead (system prompt + issue summary)
  const overheadTokens = estimateTokenCount(systemPromptBase) + estimateTokenCount(issueSummary);
  const availableForChunks = contextLimit - overheadTokens - 1000; // 1000 token buffer

  // Calculate safe batch size (each chunk ~800 tokens + overhead)
  const tokensPerChunk = chunks.reduce((sum, c) => sum + estimateTokenCount(c), 0) / chunks.length;
  const safeBatchSize = Math.max(1, Math.floor(availableForChunks / (tokensPerChunk + 200)));
  const batchSize = Math.min(safeBatchSize, chunks.length);

  logger.info(`Refiner: Processing ${chunks.length} chunks in batches of ${batchSize} (limit: ${contextLimit} tokens)`);

  const refinedChunks: string[] = [];
  let allSuccess = true;

  // Process in batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    const endIdx = Math.min(i + batchSize, chunks.length);
    const result = await processRefinementBatch(
      chunks,
      analyses,
      i,
      endIdx,
      backend,
      options
    );
    refinedChunks.push(...result.refined);
    if (!result.success) {
      allSuccess = false;
    }
  }

  return {
    refinedChunks,
    success: allSuccess,
  };
}

/**
 * Refine chunks with timeout.
 */
export async function refineChunksWithTimeout(
  chunks: string[],
  analyses: CohesionAnalysis[],
  backend: FormatterBackend,
  timeoutMs: number = 60000,
  options?: { onToken?: (token: string) => void; contextWindowSize?: number }
): Promise<RefinementResult> {
  return Promise.race([
    refineChunks(chunks, analyses, backend, options),
    new Promise<RefinementResult>((_, reject) =>
      setTimeout(() => reject(new Error('Refinement timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Check if chunks need refinement based on size.
 */
export function chunksNeedRefinement(chunks: string[]): boolean {
  const maxTokens = getDefaultChunkSize();
  return chunks.some(c => estimateTokenCount(c) > maxTokens);
}

/**
 * Split oversized chunks into smaller pieces.
 */
export function splitOversizedChunks(chunks: string[], maxTokens: number): string[] {
  const result: string[] = [];
  
  for (const chunk of chunks) {
    if (estimateTokenCount(chunk) <= maxTokens) {
      result.push(chunk);
    } else {
      // Split the chunk
      const paragraphs = chunk.split(/\n\n+/);
      let current = '';
      
      for (const para of paragraphs) {
        if (estimateTokenCount(current + '\n\n' + para) > maxTokens) {
          if (current) result.push(current.trim());
          current = para;
        } else {
          current += (current ? '\n\n' : '') + para;
        }
      }
      
      if (current.trim()) result.push(current.trim());
    }
  }
  
  return result;
}
