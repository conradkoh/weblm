/**
 * Refiner — creates refined chunks based on cohesion analysis.
 */

import type { ChatMessage } from '../../types';
import type { FormatterBackend } from './backend';
import type { CohesionAnalysis } from './cohesionAnalyzer';
import { estimateTokenCount, getDefaultChunkSize } from './tokenizer';
import { logger } from '../../logger';
import { generateId } from '../../types';

export interface RefinementResult {
  refinedChunks: string[];
  success: boolean;
  error?: string;
}

/**
 * Refine chunks based on cohesion analysis.
 * Creates improved versions that address identified issues.
 */
export async function refineChunks(
  chunks: string[],
  analyses: CohesionAnalysis[],
  backend: FormatterBackend,
  options?: { onToken?: (token: string) => void }
): Promise<RefinementResult> {
  // Check if any refinement is needed
  const needsRefinement = analyses.some(a => a.hasIssues && a.issues.length > 0);
  
  if (!needsRefinement) {
    return {
      refinedChunks: chunks,
      success: true,
    };
  }

  // Collect all issues for the system prompt
  const issueSummary = analyses
    .map((a, i) => {
      if (!a.hasIssues || a.issues.length === 0) return null;
      return `Between chunk ${i} and ${i + 1}: ${a.issues.map(i => `${i.type}: ${i.description}`).join('; ')}`;
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
${chunks.map((c, i) => `Chunk ${i + 1}:\n${c}`).join('\n\n')}

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

  const response = await backend.generate(messages, {
    temperature: 0.5,
    maxTokens: 4096,
    onToken: options?.onToken,
  });

  try {
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

    // If all chunks were lost, return original
    if (validChunks.length === 0 && refined.length === 0) {
      return {
        refinedChunks: chunks,
        success: true,
      };
    }

    return {
      refinedChunks: validChunks.length > 0 ? validChunks : refined,
      success: true,
    };
  } catch (err) {
    logger.error('Error parsing refined chunks:', err);
    return {
      refinedChunks: chunks,
      success: false,
      error: 'Failed to parse refined chunks',
    };
  }
}

/**
 * Refine chunks with timeout.
 */
export async function refineChunksWithTimeout(
  chunks: string[],
  analyses: CohesionAnalysis[],
  backend: FormatterBackend,
  timeoutMs: number = 60000
): Promise<RefinementResult> {
  return Promise.race([
    refineChunks(chunks, analyses, backend),
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