/**
 * Pipeline processor — overlaps formatting and cohesion analysis for optimal throughput.
 * 
 * For concurrent backends (worker pool): format all chunks in parallel batches, then analyze in parallel batches.
 * For sequential backends (local): interleave format and analyze to minimize idle time.
 */

import type { FormatterBackend } from './backend';
import type { CohesionAnalysis } from './cohesionAnalyzer';
import { formatChunkToMarkdown } from './markdownFormatter';
import { analyzeCohesion } from './cohesionAnalyzer';
import { logger } from '../../logger';

export interface PipelineProgress {
  phase: 'formatting' | 'analyzing' | 'refining' | 'complete';
  formatted: number;
  analyzed: number;
  total: number;
  message: string;
}

export interface PipelineResult {
  formattedChunks: string[];
  analyses: CohesionAnalysis[];
}

/**
 * Process chunks through a pipeline where formatting and cohesion analysis may overlap.
 * 
 * - Concurrent backends (worker pool): Format all chunks in parallel, then analyze in parallel
 * - Sequential backends (local): Interleave format and analyze
 * 
 * @param chunks - Raw text chunks to process
 * @param backend - Formatter backend (local or worker pool)
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to formatted chunks and cohesion analyses
 */
export async function processPipeline(
  chunks: string[],
  backend: FormatterBackend,
  onProgress?: (progress: PipelineProgress) => void | Promise<void>
): Promise<PipelineResult> {
  if (chunks.length === 0) {
    return { formattedChunks: [], analyses: [] };
  }

  const formattedChunks: (string | undefined)[] = new Array(chunks.length);
  const analyses: CohesionAnalysis[] = [];
  
  // Track counts for progress reporting
  let formattedCount = 0;
  let analyzedCount = 0;
  
  if (backend.supportsConcurrency()) {
    // ─── CONCURRENT BACKEND PATH ───
    // Format all chunks in parallel batches, then analyze in parallel batches
    
    const concurrency = backend.recommendedConcurrency();
    logger.info(`Pipeline: Using concurrent mode with concurrency ${concurrency}`);
    
    // Phase 1: Format all chunks in parallel batches
    for (let i = 0; i < chunks.length; i += concurrency) {
      const batchEnd = Math.min(i + concurrency, chunks.length);
      const batch = chunks.slice(i, batchEnd);
      
      const batchResults = await Promise.all(
        batch.map(async (chunk, batchIdx) => {
          const formatted = await formatChunkToMarkdown(chunk, backend);
          return { index: i + batchIdx, formatted };
        })
      );
      
      for (const result of batchResults) {
        formattedChunks[result.index] = result.formatted;
        formattedCount++;
      }
      
      await onProgress?.({
        phase: 'formatting',
        formatted: formattedCount,
        analyzed: analyzedCount,
        total: chunks.length,
        message: `Formatting ${formattedCount}/${chunks.length} chunks...`,
      });
    }
    
    // Phase 2: Analyze cohesion between consecutive chunks
    if (formattedChunks.length >= 2) {
      const pairCount = formattedChunks.length - 1;
      const analysisResults: CohesionAnalysis[] = new Array(pairCount);
      
      for (let i = 0; i < pairCount; i += concurrency) {
        const batchEnd = Math.min(i + concurrency, pairCount);
        
        // Create analysis promises for this batch
        const batchPromises: Promise<{ index: number; analysis: CohesionAnalysis }>[] = [];
        for (let j = i; j < batchEnd; j++) {
          const chunk1 = formattedChunks[j];
          const chunk2 = formattedChunks[j + 1];
          if (chunk1 !== undefined && chunk2 !== undefined) {
            batchPromises.push(
              analyzeCohesion(chunk1, chunk2, backend).then(analysis => ({ index: j, analysis }))
            );
          }
        }
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        for (const result of batchResults) {
          analysisResults[result.index] = result.analysis;
          analyzedCount++;
        }
        
        await onProgress?.({
          phase: 'analyzing',
          formatted: formattedCount,
          analyzed: analyzedCount,
          total: chunks.length,
          message: `Analyzing ${analyzedCount}/${pairCount} chunk pairs...`,
        });
      }
      
      // Collect non-undefined analyses
      for (const analysis of analysisResults) {
        if (analysis !== undefined) {
          analyses.push(analysis);
        }
      }
    }
    
  } else {
    // ─── SEQUENTIAL BACKEND PATH ───
    // Interleave format and analyze to minimize idle time
    // Format chunk[0] first, then for each subsequent chunk:
    //   1. Format chunk[i]
    //   2. Immediately analyze pair (chunk[i-1], chunk[i])
    
    logger.info('Pipeline: Using sequential mode (interleaved)');
    
    // Format the first chunk
    formattedChunks[0] = await formatChunkToMarkdown(chunks[0]!, backend);
    formattedCount = 1;
    
    await onProgress?.({
      phase: 'formatting',
      formatted: 1,
      analyzed: 0,
      total: chunks.length,
      message: `Formatted 1/${chunks.length} chunks`,
    });
    
    // For each subsequent chunk: format it, then immediately analyze the pair
    for (let i = 1; i < chunks.length; i++) {
      // Format chunk[i]
      formattedChunks[i] = await formatChunkToMarkdown(chunks[i]!, backend);
      formattedCount++;
      
      await onProgress?.({
        phase: 'formatting',
        formatted: formattedCount,
        analyzed: analyzedCount,
        total: chunks.length,
        message: `Formatted ${formattedCount}/${chunks.length} chunks`,
      });
      
      // Immediately analyze cohesion between chunk[i-1] and chunk[i]
      const prevChunk = formattedChunks[i - 1];
      const currChunk = formattedChunks[i];
      
      if (prevChunk !== undefined && currChunk !== undefined) {
        const analysis = await analyzeCohesion(prevChunk, currChunk, backend);
        analyses.push(analysis);
        analyzedCount++;
        
        await onProgress?.({
          phase: 'analyzing',
          formatted: formattedCount,
          analyzed: analyzedCount,
          total: chunks.length,
          message: `Formatted ${formattedCount}/${chunks.length}, Analyzed ${analyzedCount}/${i} pairs`,
        });
      }
    }
  }
  
  // Filter out undefined chunks and return results
  const validChunks = formattedChunks.filter((chunk): chunk is string => chunk !== undefined);
  
  await onProgress?.({
    phase: 'complete',
    formatted: formattedCount,
    analyzed: analyzedCount,
    total: chunks.length,
    message: `Pipeline complete: ${formattedCount} formatted, ${analyzedCount} analyzed`,
  });
  
  logger.info(`Pipeline: Complete with ${validChunks.length} chunks and ${analyses.length} analyses`);
  
  return { formattedChunks: validChunks, analyses };
}

/**
 * Create a progress handler that updates the formatter store.
 * This bridges the pipeline progress to the store's setCurrentPhase.
 */
export function createPipelineProgressHandler(
  setCurrentPhase: (phase: string | null) => void,
  setRefinementState: (state: 'idle' | 'chunking' | 'formatting' | 'analyzing' | 'refining' | 'complete' | 'error') => void
): (progress: PipelineProgress) => void {
  return (progress: PipelineProgress) => {
    if (progress.phase === 'formatting') {
      setRefinementState('formatting');
      setCurrentPhase(progress.message);
    } else if (progress.phase === 'analyzing') {
      setRefinementState('analyzing');
      setCurrentPhase(progress.message);
    } else if (progress.phase === 'complete') {
      setCurrentPhase(progress.message);
    }
  };
}