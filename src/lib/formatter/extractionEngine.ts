/**
 * Extraction Engine — orchestrates the extraction process from refined chunks.
 * Handles batching, progress tracking, and error recovery.
 */

import { getOrderedNodes, type Graph } from './graphModel';
import { parseChunkToGraph } from './extractor';
import {
  extractFromChunk, 
  extractFromGraph,
  filterByRelevance,
  getRelevantResults,
  getExtractionStats,
  type ExtractionResult,
  type RelevanceLevel
} from './extractor';
import type { FormatterBackend } from './backend';
import { LocalFormatterBackend } from './localBackend';
import { logger } from '../../logger';

export interface ExtractionProgress {
  phase: 'parsing' | 'extracting' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

export interface ExtractionEngineOptions {
  /** Backend for LLM calls (local or cloud). Defaults to LocalFormatterBackend */
  backend?: FormatterBackend;
  /** Concurrency limit for parallel LLM calls */
  concurrency?: number;
  /** Minimum relevance threshold (default: 'low') */
  minRelevance?: RelevanceLevel;
  /** Timeout per extraction in ms */
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Omit<Required<ExtractionEngineOptions>, 'backend'> & { backend: FormatterBackend } = {
  backend: new LocalFormatterBackend(),
  concurrency: 2,
  minRelevance: 'low',
  timeoutMs: 30000,
};

/**
 * Process refined chunks for extraction based on desired format.
 * Returns extraction results with progress tracking.
 */
export async function processChunks(
  refinedChunks: string[],
  desiredFormat: string,
  options: ExtractionEngineOptions = {},
  onProgress?: (progress: ExtractionProgress) => void,
  backend?: FormatterBackend
): Promise<ExtractionResult[]> {
  // Use provided backend or create default
  const effectiveBackend = backend ?? options.backend ?? new LocalFormatterBackend();
  const opts = { ...DEFAULT_OPTIONS, backend: effectiveBackend, ...options };

  if (!desiredFormat.trim()) {
    throw new Error('Desired format is required for extraction');
  }

  if (refinedChunks.length === 0) {
    return [];
  }

  const results: ExtractionResult[] = [];
  const total = refinedChunks.length;
  const concurrency = opts.concurrency ?? effectiveBackend.recommendedConcurrency();

  try {
    // Phase 1: Parse chunks to graphs (if they contain markdown headers)
    onProgress?.({
      phase: 'parsing',
      current: 0,
      total,
      message: 'Parsing chunks...',
    });

    const graphs: Graph[] = [];
    for (let i = 0; i < refinedChunks.length; i++) {
      const chunk = refinedChunks[i] ?? '';
      const graph = parseChunkToGraph(chunk);
      graphs.push(graph);
      
      onProgress?.({
        phase: 'parsing',
        current: i + 1,
        total,
        message: `Parsed ${i + 1} of ${total} chunks`,
      });
    }

    // Phase 2: Extract from chunks
    onProgress?.({
      phase: 'extracting',
      current: 0,
      total,
      message: 'Extracting content...',
    });

    // Process chunks in batches with concurrency limit
    for (let i = 0; i < graphs.length; i += concurrency) {
      const batch = graphs.slice(i, i + concurrency);
      const batchPromises = batch.map(async (graph, batchIndex) => {
        const chunkIndex = i + batchIndex;
        const chunk = refinedChunks[chunkIndex];
        
        try {
          // Try to extract from graph structure
          const nodes = getOrderedNodes(graph);
          
          if (nodes.length > 1) {
            // Has multiple sections - use graph extraction
            return await extractFromGraph(graph, desiredFormat, effectiveBackend);
          } else {
            const chunk = refinedChunks[chunkIndex] ?? '';
            // Single chunk - use direct extraction
            return [await extractFromChunk(chunk, desiredFormat, chunkIndex, effectiveBackend)];
          }
        } catch (err) {
          logger.error(`Error extracting from chunk ${chunkIndex}:`, err);
          return [{
            chunkId: chunkIndex,
            content: '<EXTRACTION_ERROR>',
            relevance: 'none' as RelevanceLevel,
            reasoning: `Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          }];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const batchResult of batchResults) {
        results.push(...batchResult);
      }

      onProgress?.({
        phase: 'extracting',
        current: Math.min(i + concurrency, total),
        total,
        message: `Extracted ${Math.min(i + concurrency, total)} of ${total} chunks`,
      });
    }

    // Phase 3: Complete
    onProgress?.({
      phase: 'complete',
      current: total,
      total,
      message: `Extraction complete: ${results.length} results`,
    });

    // Filter by minimum relevance
    const filteredResults = filterByRelevance(results, opts.minRelevance);
    logger.info(`Extraction complete: ${filteredResults.length} relevant of ${results.length} total`);

    return filteredResults;

  } catch (err) {
    onProgress?.({
      phase: 'error',
      current: 0,
      total,
      message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
    throw err;
  }
}

/**
 * Run extraction with timeout.
 */
export async function processChunksWithTimeout(
  refinedChunks: string[],
  desiredFormat: string,
  options: ExtractionEngineOptions = {},
  onProgress?: (progress: ExtractionProgress) => void,
  backend?: FormatterBackend
): Promise<ExtractionResult[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs;
  
  return Promise.race([
    processChunks(refinedChunks, desiredFormat, options, onProgress, backend),
    new Promise<ExtractionResult[]>((_, reject) =>
      setTimeout(() => reject(new Error('Extraction timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Get a summary of extraction results.
 */
export function summarizeResults(results: ExtractionResult[]): {
  stats: ReturnType<typeof getExtractionStats>;
  relevantContent: string[];
  notRelevantCount: number;
} {
  const stats = getExtractionStats(results);
  const relevantResults = getRelevantResults(results);
  
  return {
    stats,
    relevantContent: relevantResults.map(r => r.content),
    notRelevantCount: stats.notRelevant,
  };
}

/**
 * Create a human-readable status message.
 */
export function getStatusMessage(progress: ExtractionProgress): string {
  switch (progress.phase) {
    case 'parsing':
      return `Parsing chunks: ${progress.current}/${progress.total}`;
    case 'extracting':
      return `Extracting content: ${progress.current}/${progress.total}`;
    case 'complete':
      return `Complete! Processed ${progress.total} chunks`;
    case 'error':
      return `Error: ${progress.message}`;
    default:
      return progress.message;
  }
}

/**
 * Estimate remaining time based on current progress.
 */
export function estimateRemainingTime(
  progress: ExtractionProgress,
  elapsedMs: number
): number {
  if (progress.current === 0) return 0;
  
  const msPerChunk = elapsedMs / progress.current;
  const remainingChunks = progress.total - progress.current;
  return Math.round(msPerChunk * remainingChunks);
}

/**
 * Check if chunks are already markdown formatted.
 */
export function detectMarkdownChunks(chunks: string[]): boolean[] {
  return chunks.map(chunk => {
    // Check for common markdown patterns
    const hasHeaders = /^#{1,6}\s+/m.test(chunk);
    const hasLists = /^[-*+]\s/m.test(chunk) || /^\d+\.\s/m.test(chunk);
    const hasCodeBlocks = /```/.test(chunk);
    
    return hasHeaders || hasLists || hasCodeBlocks;
  });
}

/**
 * Split mixed chunks into markdown and plain text segments.
 */
export function segmentChunks(
  chunks: string[],
  isMarkdown: boolean[]
): { markdown: string[]; plain: string[] } {
  const markdown: string[] = [];
  const plain: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i] ?? '';
    if (isMarkdown[i] ?? false) {
      markdown.push(chunk);
    } else {
      plain.push(chunk);
    }
  }

  return { markdown, plain };
}