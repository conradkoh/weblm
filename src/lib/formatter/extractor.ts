/**
 * Extractor — extracts relevant content from chunks based on desired format.
 * Uses LLM to determine relevance and format output.
 */

import type { ChatMessage } from '../../types';
import type { FormatterBackend } from './backend';
import { parseMarkdownToGraph, type Graph, getOrderedNodes } from './graphModel';
import { logger } from '../../logger';
import { generateId } from '../../types';

export type RelevanceLevel = 'high' | 'medium' | 'low' | 'none';

export interface ExtractionResult {
  chunkId: number;
  nodeId?: string;
  title?: string;
  content: string;
  relevance: RelevanceLevel;
  reasoning: string;
}

/**
 * Parse markdown into graph structure.
 */
export function parseChunkToGraph(markdown: string): Graph {
  return parseMarkdownToGraph(markdown);
}

/**
 * Extract relevant content from a chunk based on desired format.
 * Uses LLM to determine relevance and format output.
 */
export async function extractFromChunk(
  chunk: string,
  desiredFormat: string,
  chunkIndex: number,
  backend: FormatterBackend
): Promise<ExtractionResult> {
  // First, check relevance using LLM
  const relevancePrompt = `You are a content extraction assistant. Your task is to:
1. Evaluate the relevance of the given chunk to the desired format criteria
2. Extract and format content that is relevant
3. Determine if the content is NOT RELEVANT

Output a JSON object with this structure:
{
  "relevant": boolean,
  "relevance": "high" | "medium" | "low" | "none",
  "reasoning": "explanation of why this content is/Isn't relevant",
  "extractedContent": "the formatted content (keep empty if not relevant)"
}

Be strict: only mark as "high" relevance if the content directly addresses the format criteria.
Mark as "none" if the content has no relevance whatsoever.
`;

  const systemPrompt = relevancePrompt;
  const userPrompt = `--- DESIRED FORMAT ---
${desiredFormat}

--- CHUNK TO EVALUATE ---
${chunk}

Output only JSON, no other text:`;

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
    temperature: 0.3,
    maxTokens: 2048,
  });

  try {
    // Try to parse JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Check for NOT RELEVANT special case
      const extractedContent = parsed.extractedContent || '';
      if (parsed.relevance === 'none' || !parsed.relevant) {
        return {
          chunkId: chunkIndex,
          content: '<NOT RELEVANT>',
          relevance: 'none',
          reasoning: parsed.reasoning || 'Content not relevant to desired format',
        };
      } else {
        return {
          chunkId: chunkIndex,
          content: extractedContent || chunk,
          relevance: parsed.relevance || 'medium',
          reasoning: parsed.reasoning || 'Content extracted based on relevance',
        };
      }
    } else {
      // If JSON parsing fails, do a simple relevance check
      const isRelevant = response.toLowerCase().includes('relevant') && 
                        !response.toLowerCase().includes('not relevant');
      
      return {
        chunkId: chunkIndex,
        content: isRelevant ? chunk : '<NOT RELEVANT>',
        relevance: isRelevant ? 'medium' : 'none',
        reasoning: 'Fallback: simple relevance check performed',
      };
    }
  } catch (err) {
    logger.error('Error parsing extraction result JSON:', err);
    // Fallback: assume medium relevance if parsing fails
    return {
      chunkId: chunkIndex,
      content: chunk,
      relevance: 'medium',
      reasoning: 'Fallback: parsing failed, using original content',
    };
  }
}

/**
 * Extract from a graph (markdown with headers).
 */
export async function extractFromGraph(
  graph: Graph,
  desiredFormat: string,
  backend: FormatterBackend
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  const nodes = getOrderedNodes(graph);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node || !node.content.trim()) continue;

    try {
      const result = await extractFromChunk(
        `## ${node.title}\n\n${node.content}`,
        desiredFormat,
        i,
        backend
      );
      result.nodeId = node.id;
      result.title = node.title;
      results.push(result);
    } catch (err) {
      logger.error(`Error extracting from node ${node.id}:`, err);
      results.push({
        chunkId: i,
        nodeId: node.id,
        title: node.title,
        content: '<ERROR>',
        relevance: 'none',
        reasoning: `Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }

  return results;
}

/**
 * Process raw text chunks (non-markdown) for extraction.
 */
export async function extractFromRawChunks(
  chunks: string[],
  desiredFormat: string,
  backend: FormatterBackend
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  const concurrency = backend.recommendedConcurrency();

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch: Promise<ExtractionResult>[] = [];
    
    for (let j = 0; j < concurrency && i + j < chunks.length; j++) {
      const idx = i + j;
      const chunk = chunks[idx] ?? '';
      
      batch.push(
        extractFromChunk(chunk, desiredFormat, idx, backend).catch(err => {
          logger.error(`Error extracting from chunk ${idx}:`, err);
          return {
            chunkId: idx,
            content: '<ERROR>',
            relevance: 'none' as RelevanceLevel,
            reasoning: `Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        })
      );
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Filter extraction results by relevance level.
 */
export function filterByRelevance(
  results: ExtractionResult[],
  minRelevance: RelevanceLevel
): ExtractionResult[] {
  const levels: Record<RelevanceLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
    none: 0,
  };

  return results.filter(r => levels[r.relevance] >= levels[minRelevance]);
}

/**
 * Get only relevant results (exclude NOT RELEVANT).
 */
export function getRelevantResults(results: ExtractionResult[]): ExtractionResult[] {
  return results.filter(r => r.relevance !== 'none' && r.content !== '<NOT RELEVANT>');
}

/**
 * Get summary statistics for extraction results.
 */
export function getExtractionStats(results: ExtractionResult[]): {
  total: number;
  relevant: number;
  notRelevant: number;
  byRelevance: Record<RelevanceLevel, number>;
} {
  const stats = {
    total: results.length,
    relevant: 0,
    notRelevant: 0,
    byRelevance: {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    } as Record<RelevanceLevel, number>,
  };

  for (const result of results) {
    stats.byRelevance[result.relevance]++;
    if (result.relevance !== 'none' && result.content !== '<NOT RELEVANT>') {
      stats.relevant++;
    } else {
      stats.notRelevant++;
    }
  }

  return stats;
}

/**
 * Format extraction results as markdown.
 */
export function formatResultsAsMarkdown(results: ExtractionResult[]): string {
  const relevantResults = getRelevantResults(results);
  
  if (relevantResults.length === 0) {
    return '# Extraction Results\n\nNo relevant content found.\n';
  }

  const lines: string[] = ['# Extraction Results\n'];
  lines.push(`_Total: ${relevantResults.length} of ${results.length} chunks relevant_\n`);

  for (const result of relevantResults) {
    if (result.title) {
      lines.push(`## ${result.title}`);
    }
    lines.push(`_Relevance: ${result.relevance}_`);
    if (result.reasoning) {
      lines.push(`_Reason: ${result.reasoning}_\n`);
    }
    lines.push(result.content);
    lines.push('\n---\n');
  }

  return lines.join('\n');
}