/**
 * Formatter store — content formatting and extraction state.
 *
 * Manages the source content, desired format instructions,
 * output results, and processing state for the Formatter mini app.
 * Includes source refinement (Phase 2) and extraction (Phase 3).
 */

import { tick } from 'svelte';
import type { FormatterState, RefinementState, ExtractionState, ExtractionResult, ChunkPipelineData, PipelineObservability, ChunkPipelineStatus, CohesionAnalysis, ChunkCache, ChunkCacheEntry } from './types';
import { parseIntoChunks } from '../lib/formatter/chunker';
import { refineChunks, type RefinementResult } from '../lib/formatter/refiner';
import { LocalFormatterBackend } from '../lib/formatter/localBackend';
import type { FormatterBackend } from '../lib/formatter/backend';
import { getModelInfo } from '../config';
import { estimateTokenCount } from '../lib/formatter/tokenizer';
import { processChunks, type ExtractionProgress } from '../lib/formatter/extractionEngine';
import { processPipeline } from '../lib/formatter/pipelineProcessor';
import { formatChunkToMarkdown } from '../lib/formatter/markdownFormatter';
import { getEngineInstance } from '../engine/engine-factory';
import { computeContentHash, createCacheEntry, getIndicesToPrune, getCacheStats } from '../lib/formatter/chunkCacheUtils';
import { logger } from '../logger';
import { generateExtractionSchema } from '../lib/formatter/schemaGenerator';
import { extractAllChunks, type ChunkExtractionResult } from '../lib/formatter/structuredExtractor';
import { aggregateChunkResults, type AggregatedData } from '../lib/formatter/aggregator';
import { renderTemplate } from '../lib/formatter/templateRenderer';
import type { ExtractionSchema } from '../lib/formatter/extractionSchema';

// ─── State ────────────────────────────────────────────────────

const _state = $state<FormatterState>({
  sourceContent: '',
  desiredFormat: '',
  outputResults: [],
  isProcessing: false,
  currentPhase: null,
  selectedModelId: null,
  refinementState: 'idle',
  refinedChunks: [],
  errorMessage: null,
  extractionState: 'idle',
  extractionResults: [],
  showAllResults: false,
  // Worker Pool configuration (Experimental)
  useWorkerPool: false,
  workerPoolSize: 2,  // 1-4, default 2
  workerModelId: '',     // model to load in workers
  // Chunk progress tracking
  totalChunks: 0,           // total chunks detected
  completedChunks: 0,       // chunks completed so far
  chunkPhase: null,         // current phase label like "Formatting 3/10"
  // Task plan for phase/step tracking
  taskPlan: {
    phases: [],
    currentPhaseIndex: 0,
    status: 'idle',
  },
  // Streaming text for live token feedback
  streamingText: '',
  // Cache: hash of source content to detect unchanged content
  sourceContentHash: null,
  // Timing metrics for runs
  runStartedAt: null,
  runCompletedAt: null,
  // Partial results for progressive output
  partialRefinedChunks: [],
  partialExtractionResults: [],
  // Stop flag for cancellation
  isStopped: false,
  // Markdown preview mode
  previewMode: 'raw',
  currentChunkIndex: 0,
  // Pipeline observability data
  pipelineData: {
    chunks: [],
    selectedChunkIndex: null,
  },
  // Incremental chunk cache for resume functionality
  chunkCache: {},
  // Per-chunk streaming state
  activeStreamingChunkIndex: null,
  activeChunkStreamingText: '',
  // Active processing chunk index (for source column highlighting)
  activeProcessingChunkIndex: null,
  // Time tracking for ETA
  chunkTimings: [],
  estimatedTimeRemaining: null,
  // Structured extraction state (Phase 4)
  extractionSchema: null,
  schemaGenerationState: 'idle',
  structuredResults: [],
  aggregatedData: null,
  renderedReport: null,
  structuredExtractionState: 'idle',
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive formatter state. */
export function getFormatterState(): FormatterState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

export function setSourceContent(content: string): void {
  _state.sourceContent = content;
  loadFromLocalStorage();
}

export function setDesiredFormat(format: string): void {
  _state.desiredFormat = format;
  loadFromLocalStorage();
}

export function setSelectedModelId(modelId: string | null): void {
  _state.selectedModelId = modelId;
  loadFromLocalStorage();
}

export function clearOutputResults(): void {
  _state.outputResults = [];
}

export function setOutputResults(results: string[]): void {
  _state.outputResults = results;
}

export function setCurrentPhase(phase: string | null): void {
  _state.currentPhase = phase;
}

export function setRefinementState(state: RefinementState): void {
  _state.refinementState = state;
}

export function setRefinedChunks(chunks: string[]): void {
  _state.refinedChunks = chunks;
}

export function setErrorMessage(message: string | null): void {
  _state.errorMessage = message;
}

// Extraction mutations
export function setExtractionState(state: ExtractionState): void {
  _state.extractionState = state;
}

// Worker Pool configuration setters (Experimental)
export function setUseWorkerPool(use: boolean): void {
  _state.useWorkerPool = use;
  loadFromLocalStorage();
}

export function setWorkerPoolSize(size: number): void {
  // Clamp to valid range 1-4
  _state.workerPoolSize = Math.max(1, Math.min(4, size));
  loadFromLocalStorage();
}

export function setWorkerModelId(modelId: string): void {
  _state.workerModelId = modelId;
  loadFromLocalStorage();
}

// Chunk progress tracking setters
export function setTotalChunks(n: number): void {
  _state.totalChunks = n;
}

export function setCompletedChunks(n: number): void {
  _state.completedChunks = n;
}

export function setChunkPhase(phase: string | null): void {
  _state.chunkPhase = phase;
}

// Task Plan functions for phase/step tracking
export function initTaskPlan(phases: Array<{ name: string; totalSteps: number }>): void {
  const now = Date.now();
  _state.taskPlan = {
    phases: phases.map(p => ({ ...p, completedSteps: 0, startedAt: now })),
    currentPhaseIndex: 0,
    status: 'running',
  };
}

export function advancePhase(): void {
  const phases = _state.taskPlan.phases;
  const currentIndex = _state.taskPlan.currentPhaseIndex;
  const now = Date.now();
  
  // Mark current phase as completed
  if (currentIndex < phases.length) {
    const currentPhase = phases[currentIndex];
    if (currentPhase) {
      currentPhase.completedAt = now;
      currentPhase.durationMs = now - (currentPhase.startedAt ?? now);
    }
  }
  
  // Move to next phase
  if (currentIndex < phases.length - 1) {
    _state.taskPlan.currentPhaseIndex++;
    // Mark next phase as started
    const nextPhase = phases[currentIndex + 1];
    if (nextPhase) {
      nextPhase.startedAt = now;
    }
  }
}

export function updatePhaseProgress(completedSteps: number): void {
  const phase = _state.taskPlan.phases[_state.taskPlan.currentPhaseIndex];
  if (phase) {
    phase.completedSteps = completedSteps;
  }
}

export function completeTaskPlan(): void {
  const phases = _state.taskPlan.phases;
  const currentIndex = _state.taskPlan.currentPhaseIndex;
  const now = Date.now();
  
  // Mark current phase as completed
  if (currentIndex < phases.length) {
    const currentPhase = phases[currentIndex];
    if (currentPhase) {
      currentPhase.completedAt = now;
      currentPhase.durationMs = now - (currentPhase.startedAt ?? now);
    }
  }
  
  _state.taskPlan.status = 'complete';
}

export function resetTaskPlan(): void {
  _state.taskPlan = { phases: [], currentPhaseIndex: 0, status: 'idle' };
}

// Streaming text mutations for live token feedback
export function appendStreamingToken(token: string): void {
  _state.streamingText += token;
}

export function clearStreamingText(): void {
  _state.streamingText = '';
}

// Partial results functions for progressive output
export function addPartialRefinedChunk(chunk: string): void {
  _state.partialRefinedChunks = [..._state.partialRefinedChunks, chunk];
}

/**
 * Record the timing for a completed chunk.
 * @param durationMs Time in milliseconds it took to process this chunk
 */
export function addChunkTiming(durationMs: number): void {
  _state.chunkTimings = [..._state.chunkTimings, durationMs];
}

/**
 * Update the estimated time remaining based on chunk timings.
 * Calculates average time per chunk and multiplies by remaining chunks.
 */
export function updateTimeEstimate(): void {
  const { chunkTimings, totalChunks } = _state;
  const completedChunks = _state.partialRefinedChunks.length;
  const remainingChunks = totalChunks - completedChunks;
  
  if (remainingChunks <= 0 || chunkTimings.length === 0) {
    _state.estimatedTimeRemaining = null;
    return;
  }
  
  // Calculate average time per chunk
  const totalTime = chunkTimings.reduce((sum, t) => sum + t, 0);
  const avgTimePerChunk = totalTime / chunkTimings.length;
  
  // Estimate remaining time
  _state.estimatedTimeRemaining = Math.round(avgTimePerChunk * remainingChunks);
}

/**
 * Retry formatting a single chunk without re-running the full pipeline.
 * @param index The chunk index to retry
 */
export async function retryChunk(index: number): Promise<void> {
  // Don't allow retry while already processing
  if (_state.isProcessing) {
    logger.warn('RetryChunk: already processing, ignoring');
    return;
  }
  
  // Get the raw chunk text from pipeline data
  const chunk = _state.pipelineData.chunks[index];
  if (!chunk) {
    logger.error(`RetryChunk: no chunk at index ${index}`);
    return;
  }
  
  const rawText = chunk.rawText;
  
  logger.info(`RetryChunk: retrying chunk ${index}`);
  
  // Set processing state
  _state.isProcessing = true;
  setActiveStreamingChunk(index);
  setActiveProcessingChunkIndex(index);
  clearActiveChunkStreaming();
  
  // Mark chunk as formatting in pipeline data
  setChunkFormatting(index);
  
  try {
    // Get the formatter backend
    const backend = getFormatterBackend();
    
    // Format the chunk with streaming
    const formattedText = await formatChunkToMarkdown(rawText, backend, {
      onToken: (token) => {
        _state.activeChunkStreamingText += token;
      },
    });
    
    // Update pipeline data with new formatted text
    updateChunkFormatting(index, formattedText);
    setChunkRefined(index);
    
    // Update refinedChunks at this index
    const newRefinedChunks = [..._state.refinedChunks];
    newRefinedChunks[index] = formattedText;
    setRefinedChunks(newRefinedChunks);
    
    // Update partialRefinedChunks at this index
    const newPartialChunks = [..._state.partialRefinedChunks];
    newPartialChunks[index] = formattedText;
    _state.partialRefinedChunks = newPartialChunks;
    
    // Update chunk cache for future resume
    const cacheKey = index;
    const hash = computeContentHash(rawText, rawText.length);
    _state.chunkCache[cacheKey] = {
      hash,
      refinedText: formattedText,
      refinedAt: Date.now(),
    };
    
    logger.info(`RetryChunk: chunk ${index} reformatted successfully`);
  } catch (error) {
    logger.error(`RetryChunk: failed for chunk ${index}`, error);
    _state.errorMessage = `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  } finally {
    // Clear active streaming state
    _state.activeStreamingChunkIndex = null;
    _state.activeChunkStreamingText = '';
    _state.activeProcessingChunkIndex = null;
    _state.isProcessing = false;
    
    // Restore refinement state if we were complete
    if (_state.refinedChunks.length > 0) {
      _state.refinementState = 'complete';
    }
  }
}

/**
 * Stop the current processing and promote partial results.
 * Used by the Stop button to cancel mid-run while keeping results.
 */
export function stopProcessing(): void {
  if (!_state.isProcessing) return;
  
  logger.info('Stop requested - promoting partial results');
  
  // Actually stop the engine generation
  try {
    const engine = getEngineInstance();
    if (engine.isGenerating()) {
      engine.stopGeneration();
      logger.info('Engine generation stopped');
    }
  } catch (err) {
    logger.warn('Could not stop engine:', err);
  }
  
  // Stop processing
  _state.isProcessing = false;
  _state.isStopped = true;
  
  // Promote partial results to final
  if (_state.partialRefinedChunks.length > 0) {
    _state.refinedChunks = _state.partialRefinedChunks;
    logger.info(`Promoted ${_state.partialRefinedChunks.length} partial refined chunks to final`);
  }
  
  if (_state.partialExtractionResults.length > 0) {
    _state.extractionResults = _state.partialExtractionResults;
    logger.info(`Promoted ${_state.partialExtractionResults.length} partial extraction results to final`);
  }
  
  // Set states to complete with partial indicator
  if (_state.refinementState !== 'idle' && _state.refinementState !== 'complete') {
    setRefinementState('complete');
    setCurrentPhase(`Stopped: ${_state.partialRefinedChunks.length} of ${_state.totalChunks} chunks completed`);
  }
  
  if (_state.extractionState !== 'idle' && _state.extractionState !== 'complete') {
    setExtractionState('complete');
  }
  
  // Complete task plan
  completeTaskPlan();
  _state.runCompletedAt = Date.now();
  
  // Clear streaming
  clearStreamingText();
}

// Preview mode mutations for markdown preview
export function setPreviewMode(mode: 'raw' | 'preview' | 'chunks'): void {
  _state.previewMode = mode;
}

export function setCurrentChunkIndex(index: number): void {
  if (index >= 0 && index < _state.refinedChunks.length) {
    _state.currentChunkIndex = index;
  }
}

export function nextChunk(): void {
  if (_state.currentChunkIndex < _state.refinedChunks.length - 1) {
    _state.currentChunkIndex++;
  }
}

export function prevChunk(): void {
  if (_state.currentChunkIndex > 0) {
    _state.currentChunkIndex--;
  }
}

// Pipeline observability functions
/**
 * Initialize pipeline data for all chunks at the start of refinement.
 * Creates ChunkPipelineData entries with raw text and token counts.
 */
export function initPipelineData(rawChunks: string[]): void {
  _state.pipelineData = {
    chunks: rawChunks.map((rawText, index) => ({
      index,
      rawText,
      rawTokenCount: estimateTokenCount(rawText),
      formattedText: null,
      formattedAt: null,
      cohesionWithNext: null,
      cohesionWithPrev: null,
      analyzedAt: null,
      refinedText: null,
      refinedAt: null,
      wasModified: false,
      status: 'pending' as ChunkPipelineStatus,
      error: null,
    })),
    selectedChunkIndex: null,
  };
  logger.debug(`PipelineData: initialized ${rawChunks.length} chunks`);
}

/**
 * Update a chunk's formatting status and output.
 */
export function updateChunkFormatting(index: number, formattedText: string): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const chunk: ChunkPipelineData = {
      ...existing,
      formattedText,
      formattedAt: Date.now(),
      status: 'formatted',
    };
    _state.pipelineData.chunks = [
      ...chunks.slice(0, index),
      chunk,
      ...chunks.slice(index + 1),
    ];
  }
}

/**
 * Mark a chunk as currently formatting.
 */
export function setChunkFormatting(index: number): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const chunk: ChunkPipelineData = {
      ...existing,
      status: 'formatting',
    };
    _state.pipelineData.chunks = [
      ...chunks.slice(0, index),
      chunk,
      ...chunks.slice(index + 1),
    ];
  }
}

/**
 * Update a chunk's cohesion analysis results.
 */
export function updateChunkAnalysis(index: number, cohesionWithNext: CohesionAnalysis | null): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const chunk: ChunkPipelineData = {
      ...existing,
      cohesionWithNext,
      analyzedAt: Date.now(),
      status: 'analyzed',
    };
    // Also update previous chunk's cohesionWithPrev if this is chunk > 0
    if (index > 0) {
      const prevExisting = chunks[index - 1]!;
      const prevChunk: ChunkPipelineData = {
        ...prevExisting,
        cohesionWithPrev: cohesionWithNext,
        status: 'analyzed',
        analyzedAt: Date.now(),
      };
      _state.pipelineData.chunks = [
        ...chunks.slice(0, index - 1),
        prevChunk,
        chunk,
        ...chunks.slice(index + 1),
      ];
    } else {
      _state.pipelineData.chunks = [
        ...chunks.slice(0, index),
        chunk,
        ...chunks.slice(index + 1),
      ];
    }
  }
}

/**
 * Mark a chunk as currently analyzing.
 */
export function setChunkAnalyzing(index: number): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const chunk: ChunkPipelineData = {
      ...existing,
      status: 'analyzing',
    };
    _state.pipelineData.chunks = [
      ...chunks.slice(0, index),
      chunk,
      ...chunks.slice(index + 1),
    ];
  }
}

/**
 * Update a chunk's refinement result.
 */
export function updateChunkRefinement(index: number, refinedText: string): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const wasModified = existing.formattedText !== null && refinedText !== existing.formattedText;
    const chunk: ChunkPipelineData = {
      ...existing,
      refinedText,
      refinedAt: Date.now(),
      wasModified,
      status: 'refined',
    };
    _state.pipelineData.chunks = [
      ...chunks.slice(0, index),
      chunk,
      ...chunks.slice(index + 1),
    ];
  }
}

/**
 * Mark a chunk as currently refining.
 */
export function setChunkRefining(index: number): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const chunk: ChunkPipelineData = {
      ...existing,
      status: 'refining',
    };
    _state.pipelineData.chunks = [
      ...chunks.slice(0, index),
      chunk,
      ...chunks.slice(index + 1),
    ];
  }
}

/**
 * Mark a chunk as refined.
 */
export function setChunkRefined(index: number): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const chunk: ChunkPipelineData = {
      ...existing,
      status: 'refined',
      refinedAt: Date.now(),
    };
    _state.pipelineData.chunks = [
      ...chunks.slice(0, index),
      chunk,
      ...chunks.slice(index + 1),
    ];
  }
}

/**
 * Mark a chunk as having an error.
 */
/**
 * Select a chunk for inspection in the pipeline detail panel.
 */
export function selectChunkForInspection(index: number | null): void {
  _state.pipelineData.selectedChunkIndex = index;
}

/**
 * Clear pipeline data when refinement is reset.
 */
export function clearPipelineData(): void {
  _state.pipelineData = {
    chunks: [],
    selectedChunkIndex: null,
  };
}

// Cache functions for refinement results
export function invalidateRefinementCache(): void {
  _state.sourceContentHash = null;
}

// ─── Chunk Cache Functions ──────────────────────────────────────

/**
 * Get cache entry for a specific chunk index.
 */
export function getChunkCacheEntry(index: number): ChunkCacheEntry | null {
  return _state.chunkCache[index] ?? null;
}

/**
 * Check if a chunk matches its cache entry.
 * Returns true if cache exists and hash matches.
 */
export function isChunkCached(index: number, chunkText: string): boolean {
  const entry = _state.chunkCache[index];
  if (!entry) return false;
  const chunkHash = computeContentHash(chunkText, chunkText.length);
  return entry.hash === chunkHash;
}

/**
 * Store a refined chunk in the cache.
 */
export function cacheRefinedChunk(index: number, chunkText: string | null | undefined, refinedText: string | null | undefined): void {
  if (!chunkText || !refinedText) {
    logger.warn(`ChunkCache: skipping cache for chunk ${index} — missing text`);
    return;
  }
  _state.chunkCache[index] = {
    hash: computeContentHash(chunkText, chunkText.length),
    refinedText,
    refinedAt: Date.now(),
  };
}

/**
 * Clear cache entries for chunks that no longer exist.
 * Called when new chunk count is less than previous.
 */
export function pruneChunkCache(newChunkCount: number): void {
  const oldIndices = getIndicesToPrune(_state.chunkCache, newChunkCount);
  
  for (const idx of oldIndices) {
    delete _state.chunkCache[idx];
  }
  
  if (oldIndices.length > 0) {
    logger.debug(`ChunkCache: pruned ${oldIndices.length} stale entries`);
  }
}

/**
 * Get cache statistics for logging.
 */
export function getChunkCacheStats(): { entries: number; totalBytes: number } {
  const entries = Object.keys(_state.chunkCache).length;
  const totalBytes = Object.values(_state.chunkCache)
    .reduce((sum, entry) => sum + entry.refinedText.length, 0);
  return { entries, totalBytes };
}

// ─── Per-Chunk Streaming Functions ───────────────────────────────────

/**
 * Set the currently streaming chunk index.
 * Called when a chunk starts streaming.
 */
export function setActiveStreamingChunk(index: number | null): void {
  _state.activeStreamingChunkIndex = index;
  if (index === null) {
    _state.activeChunkStreamingText = '';
  }
}

/**
 * Append a token to the active chunk's streaming text.
 */
export function appendActiveChunkToken(token: string): void {
  _state.activeChunkStreamingText += token;
}

/**
 * Clear the active chunk streaming text.
 */
export function clearActiveChunkStreaming(): void {
  _state.activeChunkStreamingText = '';
}

/**
 * Set the active processing chunk index.
 * Used for highlighting in the source column's ChunkList.
 */
export function setActiveProcessingChunkIndex(index: number | null): void {
  _state.activeProcessingChunkIndex = index;
}

// computeContentHash is imported from '../lib/formatter/chunkCacheUtils'

/**
 * Check if content matches stored hash (with length verification).
 * More reliable than hash-only check due to collision protection.
 */
/**
 * Get the appropriate formatter backend based on current settings.
 * Priority: Worker Pool > Local
 */
export function getFormatterBackend(): FormatterBackend {
  // Priority 1: Worker Pool (lazy import to avoid bundling issues)
  if (_state.useWorkerPool && _state.workerModelId) {
    logger.info(`Using WorkerPoolFormatterBackend (${_state.workerPoolSize} workers)`);
    const { WorkerPoolFormatterBackend } = require('../lib/formatter/workerBackend');
    return new WorkerPoolFormatterBackend(_state.workerModelId, _state.workerPoolSize);
  }
  
  // Priority 2: Local
  return new LocalFormatterBackend();
}

// ─── Refinement Pipeline ──────────────────────────────────────

/**
 * Run the complete refinement pipeline on the source content.
 * Phase 1: Source Refinement
 * @param options.force - If true, bypass cache check and re-process
 */
export async function runRefinement(options?: { force?: boolean }): Promise<void> {
  const { sourceContent } = _state;
  // Get backend based on settings (cloud or local)
  const backend = getFormatterBackend();
  const concurrency = backend.recommendedConcurrency();

  if (!sourceContent.trim()) {
    setErrorMessage('Source content is empty');
    setRefinementState('error');
    return;
  }

  // Step 0: Check cache BEFORE clearing any state
  // If content unchanged and we have cached results, skip processing entirely
  const forceRefinement = options?.force ?? false;
  if (!forceRefinement && _state.sourceContentHash !== null && _state.refinedChunks.length > 0) {
    // Verify hash with length check for collision protection
    const currentHash = computeContentHash(sourceContent, sourceContent.length);
    if (currentHash === _state.sourceContentHash) {
      // Content unchanged, use cached results
      _state.runStartedAt = Date.now();
      _state.runCompletedAt = Date.now();
      setRefinementState('complete');
      setCurrentPhase(`Using cached refinement (${_state.refinedChunks.length} chunks)`);
      logger.info(`Refinement: Using cached results (${_state.refinedChunks.length} chunks)`);
      return; // Early return - don't set isProcessing
    }
  }

  // Proceeding with refinement - clear state
  _state.isProcessing = true;
  _state.errorMessage = null;
  _state.refinedChunks = [];
  _state.partialRefinedChunks = [];
  _state.partialExtractionResults = [];
  _state.isStopped = false;
  _state.runStartedAt = Date.now();
  _state.runCompletedAt = null;

  try {
    // Step 1: Parse into chunks using model's context window
    setRefinementState('chunking');
    setCurrentPhase('Parsing source into chunks...');
    await tick(); // Allow UI to repaint
    logger.info('Refinement: Starting chunking');
    
    // Use static 800 token chunk size
    const chunkSize = 800;
    
    const chunks: string[] = parseIntoChunks(sourceContent, { chunkSize });
    
    if (chunks.length === 0) {
      throw new Error('No content to process');
    }
    
    logger.info(`Refinement: Created ${chunks.length} chunks`);

    // Initialize pipeline observability data
    initPipelineData(chunks);

    // Initialize task plan with 3 phases based on chunk count
    // Refinement has 3 phases: Formatting (N steps), Analyzing (N-1 steps), Refining (1 step)
    initTaskPlan([
      { name: 'Formatting', totalSteps: chunks.length },
      { name: 'Analyzing', totalSteps: Math.max(chunks.length - 1, 0) },
      { name: 'Refining', totalSteps: 1 },
    ]);

    // Set up chunk progress tracking
    setTotalChunks(chunks.length);
    setCompletedChunks(0);
    await tick(); // Show chunk count in UI

    // Steps 2 & 3: Format and analyze using pipeline (overlaps where possible)
    // The pipeline handles both formatting and cohesion analysis with optimal parallelism
    setRefinementState('formatting');
    
    // Track phase transitions to avoid calling advancePhase() multiple times
    let hasAdvancedToAnalyzing = false;
    let hasAdvancedToRefining = false;
    
    // Clear and set up streaming for refinement pipeline
    clearStreamingText();
    clearActiveChunkStreaming();
    const streamingCallback = (token: string) => {
      appendStreamingToken(token);
      appendActiveChunkToken(token);
    };
    
    // Enhanced progress handler that updates chunk progress and task plan
    const pipelineProgressHandler = async (progress: { phase: string; formatted: number; analyzed: number; total: number; message: string }) => {
      // Clear streaming at start of analyzing phase
      if (progress.phase === 'analyzing' && progress.analyzed === 1) {
        clearStreamingText();
      }
      setCurrentPhase(progress.message);
      setCompletedChunks(progress.formatted);
      if (progress.phase === 'formatting') {
        setRefinementState('formatting');
        setChunkPhase(`Formatting chunk ${progress.formatted}/${progress.total}`);
        updatePhaseProgress(progress.formatted);
      } else if (progress.phase === 'analyzing') {
        // Advance to analyzing phase only once
        if (!hasAdvancedToAnalyzing) {
          advancePhase();
          hasAdvancedToAnalyzing = true;
        }
        setRefinementState('analyzing');
        setChunkPhase(`Analyzing chunk ${progress.analyzed}/${progress.total - 1}`);
        updatePhaseProgress(progress.analyzed);
      } else if (progress.phase === 'complete') {
        // Advance to refining phase only once
        if (!hasAdvancedToRefining) {
          advancePhase();
          hasAdvancedToRefining = true;
        }
        setChunkPhase(null);
        updatePhaseProgress(1);
      }
      await tick(); // Allow UI to repaint after state update
    };
    
    // Per-chunk streaming callbacks
    const onChunkStreamStart = (index: number) => {
      setActiveStreamingChunk(index);
      setActiveProcessingChunkIndex(index);
      clearActiveChunkStreaming();
      // Track start time for timing calculation
      chunkStartTimes.set(index, Date.now());
    };
    
    // Track chunk timing
    const chunkStartTimes: Map<number, number> = new Map();
    
    // Chunk complete callback for progressive output and pipeline observability
    const onChunkComplete = (formattedChunk: string, index: number) => {
      // Record timing if we have a start time for this chunk
      const startTime = chunkStartTimes.get(index);
      if (startTime !== undefined) {
        const duration = Date.now() - startTime;
        addChunkTiming(duration);
        updateTimeEstimate();
        chunkStartTimes.delete(index);
      }
      addPartialRefinedChunk(formattedChunk);
      // Update pipeline data with formatting result
      setChunkFormatting(index);
      updateChunkFormatting(index, formattedChunk);
    };
    
    const onChunkStreamEnd = (index: number) => {
      setActiveStreamingChunk(null);
    };
    
    const { formattedChunks, analyses } = await processPipeline(
      chunks,
      backend,
      pipelineProgressHandler,
      streamingCallback,
      onChunkComplete,
      onChunkStreamStart,
      onChunkStreamEnd
    );
    
    // Update pipeline data with analysis results
    for (let i = 0; i < analyses.length; i++) {
      setChunkAnalyzing(i);
      updateChunkAnalysis(i, analyses[i] ?? null);
    }
    
    logger.info(`Refinement: Pipeline complete with ${formattedChunks.length} chunks and ${analyses.length} analyses`);
    
    const issuesFound = analyses.filter(a => a.hasIssues).length;
    logger.info(`Refinement: Found ${issuesFound} pairs with cohesion issues`);

    // Step 4: Refine chunks based on cohesion analysis
    setRefinementState('refining');
    setCurrentPhase('Refining chunks based on analysis...');
    clearStreamingText();
    logger.info('Refinement: Starting chunk refinement');
    
    // Mark all chunks as refining in pipeline data
    for (let i = 0; i < formattedChunks.length; i++) {
      setChunkRefining(i);
    }
    
    // Incremental caching: check which chunks need refinement
    const cacheStats = getChunkCacheStats();
    logger.info(`ChunkCache: ${cacheStats.entries} entries (${Math.round(cacheStats.totalBytes / 1024)}KB) in cache`);
    
    // Identify chunks to refine vs use from cache
    const chunksToRefine: { index: number; chunk: string; analysis: CohesionAnalysis }[] = [];
    const cachedResults: string[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;
    
    for (let i = 0; i < formattedChunks.length; i++) {
      const chunk = formattedChunks[i]!;
      if (isChunkCached(i, chunk)) {
        const entry = getChunkCacheEntry(i);
        cachedResults.push(entry!.refinedText);
        cacheHits++;
        logger.debug(`ChunkCache: HIT for chunk ${i}`);
      } else {
        const analysis = analyses[i] ?? { hasIssues: false, issues: [], summary: '' };
        chunksToRefine.push({ index: i, chunk, analysis });
        cacheMisses++;
        logger.debug(`ChunkCache: MISS for chunk ${i}`);
      }
    }
    
    logger.info(`ChunkCache: ${cacheHits} hits, ${cacheMisses} misses (${chunksToRefine.length} chunks need refinement)`);
    
    let refinedChunks: string[] = [];
    
    if (chunksToRefine.length === 0) {
      // All chunks are cached, use cached results
      refinedChunks = cachedResults;
      logger.info('ChunkCache: All chunks from cache, skipping refinement');
    } else if (chunksToRefine.length < formattedChunks.length) {
      // Partial cache - refine only missing chunks
      // Group consecutive chunks for batch processing
      const chunksForRefinement = chunksToRefine.map(c => c.chunk);
      const analysesForRefinement = chunksToRefine.map(c => c.analysis);
      
      const partialResult: RefinementResult = await refineChunks(chunksForRefinement, analysesForRefinement, backend, { onToken: streamingCallback });
      
      if (partialResult.success) {
        // Map results back to correct positions and merge with cached
        refinedChunks = new Array(formattedChunks.length).fill('');
        let refinedIdx = 0;
        let cacheIdx = 0;
        
        for (let i = 0; i < formattedChunks.length; i++) {
          if (isChunkCached(i, formattedChunks[i]!)) {
            refinedChunks[i] = getChunkCacheEntry(i)!.refinedText;
          } else {
            refinedChunks[i] = partialResult.refinedChunks[refinedIdx] ?? formattedChunks[i]!;
            // Cache the refined chunk
            const formatted = formattedChunks[i];
            const refined = refinedChunks[i];
            if (formatted && refined) {
              cacheRefinedChunk(i, formatted, refined);
            }
            refinedIdx++;
          }
        }
      } else {
        refinedChunks = formattedChunks;
      }
    } else {
      // No cache hits - refine all chunks normally
      const refinementResult: RefinementResult = await refineChunks(formattedChunks, analyses, backend, { onToken: streamingCallback });
      
      if (refinementResult.success) {
        refinedChunks = refinementResult.refinedChunks;
        // Cache all refined chunks
        for (let i = 0; i < refinedChunks.length; i++) {
          const formatted = formattedChunks[i];
          const refined = refinedChunks[i];
          if (formatted && refined) {
            cacheRefinedChunk(i, formatted, refined);
          }
        }
      } else {
        refinedChunks = formattedChunks;
      }
    }
    
    const finalCacheStats = getChunkCacheStats();
    logger.info(`ChunkCache: ${finalCacheStats.entries} entries after refinement`);
    
    // Prune cache for chunks that no longer exist
    pruneChunkCache(refinedChunks.length);
    
    // Validate chunk sizes (800 tokens max, ~3200 chars)
    const validChunks = refinedChunks.filter(c => {
      return estimateTokenCount(c) <= 800;
    });
    
    // Update pipeline data with refinement results
    for (let i = 0; i < refinedChunks.length; i++) {
      updateChunkRefinement(i, refinedChunks[i] ?? '');
    }
    
    _state.refinedChunks = validChunks;
    // Store content hash for cache
    _state.sourceContentHash = computeContentHash(sourceContent, sourceContent.length);
    _state.runCompletedAt = Date.now();
    updatePhaseProgress(1);
    completeTaskPlan();
    setRefinementState('complete');
    setCurrentPhase(`Refinement complete: ${validChunks.length} refined chunks`);
    logger.info(`Refinement: Complete with ${validChunks.length} refined chunks`);
  
  } catch (err) {
    _state.runCompletedAt = Date.now();
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Refinement error:', err);
    setErrorMessage(errorMsg);
    setRefinementState('error');
    _state.taskPlan.status = 'error';
    setCurrentPhase(`Error: ${errorMsg}`);
    setActiveProcessingChunkIndex(null);
  } finally {
    _state.isProcessing = false;
    setActiveProcessingChunkIndex(null);
  }
}

/**
 * Reset the refinement state.
 */
export function resetRefinement(): void {
  _state.refinementState = 'idle';
  _state.refinedChunks = [];
  _state.partialRefinedChunks = [];
  _state.errorMessage = null;
  _state.currentPhase = null;
  _state.totalChunks = 0;
  _state.completedChunks = 0;
  _state.chunkPhase = null;
  _state.runStartedAt = null;
  _state.runCompletedAt = null;
  _state.isStopped = false;
  _state.previewMode = 'raw';
  _state.currentChunkIndex = 0;
  _state.chunkTimings = [];
  _state.estimatedTimeRemaining = null;
  resetTaskPlan();
  clearStreamingText();
  invalidateRefinementCache();
  clearPipelineData();
}

// ─── Extraction Pipeline ──────────────────────────────────────

/**
 * Run the extraction pipeline on refined chunks.
 * Phase 3: Content Extraction
 */
export async function runExtraction(): Promise<void> {
  const { refinedChunks, desiredFormat } = _state;
  // Get backend based on settings (cloud or local)
  const backend = getFormatterBackend();
  const concurrency = backend.recommendedConcurrency();

  if (refinedChunks.length === 0) {
    setErrorMessage('No refined chunks available. Run refinement first.');
    setExtractionState('error');
    return;
  }

  if (!desiredFormat.trim()) {
    setErrorMessage('Desired format is required for extraction');
    setExtractionState('error');
    return;
  }

  _state.isProcessing = true;
  _state.errorMessage = null;
  _state.extractionResults = [];
  _state.runStartedAt = Date.now();
  _state.runCompletedAt = null;
  
  // Initialize task plan with 2 phases based on refined chunk count
  // Extraction has 2 phases: Parsing (N steps), Extracting (N steps)
  initTaskPlan([
    { name: 'Parsing', totalSteps: refinedChunks.length },
    { name: 'Extracting', totalSteps: refinedChunks.length },
  ]);
  
  // Set up extraction chunk progress
  setTotalChunks(refinedChunks.length);
  setCompletedChunks(0);

  // Track phase transitions to avoid calling advancePhase() multiple times
  let hasAdvancedToExtracting = false;

  // Clear and set up streaming for extraction
  clearStreamingText();
  const streamingCallback = (token: string) => {
    appendStreamingToken(token);
  };

  try {
    setExtractionState('parsing');
    setCurrentPhase('Parsing refined chunks...');
    logger.info('Extraction: Starting');

    const results = await processChunks(
      refinedChunks,
      desiredFormat,
      { concurrency, onToken: streamingCallback },
      (progress: ExtractionProgress) => {
        // Clear streaming at start of each phase
        if (progress.phase === 'extracting' && progress.current === 1) {
          clearStreamingText();
        }
        setCurrentPhase(progress.message);
        setCompletedChunks(progress.current);
        if (progress.phase === 'parsing') {
          setChunkPhase(`Parsing chunk ${progress.current}/${progress.total}`);
          updatePhaseProgress(progress.current);
        } else if (progress.phase === 'extracting') {
          // Advance to extracting phase only once
          if (!hasAdvancedToExtracting) {
            advancePhase();
            hasAdvancedToExtracting = true;
          }
          setExtractionState('extracting');
          setChunkPhase(`Extracting chunk ${progress.current}/${progress.total}`);
          updatePhaseProgress(progress.current);
        }
      },
      backend
    );

    clearStreamingText();
    _state.extractionResults = results;
    _state.runCompletedAt = Date.now();
    completeTaskPlan();
    setChunkPhase(null);
    setExtractionState('complete');
    setCurrentPhase(`Extraction complete: ${results.length} relevant results`);
    logger.info(`Extraction: Complete with ${results.length} results`);

    // Update output results with extraction content
    const outputContent = results
      .filter(r => r.relevance !== 'none' && r.content !== '<NOT RELEVANT>')
      .map(r => r.title ? `## ${r.title}\n\n${r.content}` : r.content);
    
    setOutputResults(outputContent);

  } catch (err) {
    _state.runCompletedAt = Date.now();
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Extraction error:', err);
    setErrorMessage(errorMsg);
    setExtractionState('error');
    _state.taskPlan.status = 'error';
    setCurrentPhase(`Error: ${errorMsg}`);
  } finally {
    _state.isProcessing = false;
  }
}

/**
 * Reset the extraction state.
 */
export function resetExtraction(): void {
  _state.extractionState = 'idle';
  _state.extractionResults = [];
  _state.partialExtractionResults = [];
  _state.showAllResults = false;
  _state.totalChunks = 0;
  _state.completedChunks = 0;
  _state.chunkPhase = null;
  _state.runStartedAt = null;
  _state.runCompletedAt = null;
  _state.isStopped = false;
  _state.chunkTimings = [];
  _state.estimatedTimeRemaining = null;
  resetTaskPlan();
  clearStreamingText();
  clearPipelineData();
  // Also reset structured extraction state
  _state.extractionSchema = null;
  _state.schemaGenerationState = 'idle';
  _state.structuredResults = [];
  _state.aggregatedData = null;
  _state.renderedReport = null;
  _state.structuredExtractionState = 'idle';
}

/**
 * Toggle showing all results (including not relevant).
 */
export function toggleShowAllResults(): void {
  _state.showAllResults = !_state.showAllResults;
}

// ─── Structured Extraction (Phase 4) ──────────────────────────────────────

/**
 * Generate extraction schema from desired format.
 * Calls the LLM to generate a structured schema based on user's format description.
 */
export async function generateSchema(): Promise<void> {
  const { desiredFormat } = _state;
  const backend = getFormatterBackend();

  if (!desiredFormat.trim()) {
    setErrorMessage('Desired format is required to generate schema');
    _state.schemaGenerationState = 'error';
    return;
  }

  _state.schemaGenerationState = 'generating';
  _state.errorMessage = null;

  try {
    logger.info('Schema generation: Starting');
    const schema = await generateExtractionSchema(backend, desiredFormat);

    if (schema) {
      _state.extractionSchema = schema;
      _state.schemaGenerationState = 'complete';
      logger.info('Schema generation: Complete', { fields: schema.fields.length });
    } else {
      _state.errorMessage = 'Failed to generate schema';
      _state.schemaGenerationState = 'error';
      logger.warn('Schema generation: Failed - no schema returned');
    }
  } catch (err) {
    _state.errorMessage = err instanceof Error ? err.message : 'Schema generation failed';
    _state.schemaGenerationState = 'error';
    logger.error('Schema generation: Error', err);
  }
}

/**
 * Run the full structured extraction pipeline.
 * Orchestrates: schema generation → per-chunk extraction → aggregation → rendering.
 */
export async function runStructuredExtraction(): Promise<void> {
  const { refinedChunks, desiredFormat, extractionSchema } = _state;
  const backend = getFormatterBackend();

  if (refinedChunks.length === 0) {
    setErrorMessage('No refined chunks available. Run refinement first.');
    _state.structuredExtractionState = 'error';
    return;
  }

  _state.isProcessing = true;
  _state.errorMessage = null;
  _state.runStartedAt = Date.now();
  _state.runCompletedAt = null;

  try {
    // Step 1: Generate schema if not already present
    if (!extractionSchema || _state.schemaGenerationState !== 'complete') {
      setCurrentPhase('Generating extraction schema...');
      await generateSchema();

      if (_state.schemaGenerationState !== 'complete' || !_state.extractionSchema) {
        throw new Error(_state.errorMessage ?? 'Schema generation failed');
      }
    }

    // We know schema is not null here due to the checks above
    const schema = _state.extractionSchema!;

    // Step 2: Extract from all chunks
    _state.structuredExtractionState = 'extracting';
    setCurrentPhase(`Extracting from ${refinedChunks.length} chunks...`);
    logger.info('Structured extraction: Starting per-chunk extraction');

    _state.structuredResults = [];
    const extractionResults: ChunkExtractionResult[] = [];

    for (let i = 0; i < refinedChunks.length; i++) {
      setChunkPhase(`Extracting chunk ${i + 1}/${refinedChunks.length}`);
      
      // Use streaming callback for live feedback
      clearActiveChunkStreaming();
      setActiveStreamingChunk(i);
      setActiveProcessingChunkIndex(i);

      // We need to import extractChunkData directly
      const { extractChunkData } = await import('../lib/formatter/structuredExtractor');
      const result = await extractChunkData(refinedChunks[i]!, i, schema, backend, {
        onToken: (token) => {
          appendActiveChunkToken(token);
        },
      });

      extractionResults.push(result);
      setActiveStreamingChunk(null);
      setActiveProcessingChunkIndex(null);
    }

    _state.structuredResults = extractionResults;
    logger.info('Structured extraction: Per-chunk extraction complete', { chunks: extractionResults.length });

    // Step 3: Aggregate results
    _state.structuredExtractionState = 'aggregating';
    setCurrentPhase('Aggregating results...');
    const aggregated = aggregateChunkResults(extractionResults, schema.fields);
    _state.aggregatedData = aggregated;
    logger.info('Structured extraction: Aggregation complete');

    // Step 4: Render with template
    _state.structuredExtractionState = 'rendering';
    setCurrentPhase('Rendering report...');
    
    // Use a default template that shows all fields if no template in schema
    const template = schema.fields
      .map(f => `{{${f.path}}}: {{{${f.path}}}}`)
      .join('\n');
    
    const rendered = renderTemplate(template, aggregated);
    _state.renderedReport = rendered;
    logger.info('Structured extraction: Rendering complete');

    // Final state
    _state.structuredExtractionState = 'complete';
    _state.runCompletedAt = Date.now();
    setCurrentPhase('Structured extraction complete');
    logger.info('Structured extraction: Pipeline complete');

  } catch (err) {
    _state.runCompletedAt = Date.now();
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Structured extraction error:', err);
    setErrorMessage(errorMsg);
    _state.structuredExtractionState = 'error';
    setCurrentPhase(`Error: ${errorMsg}`);
  } finally {
    _state.isProcessing = false;
    setActiveProcessingChunkIndex(null);
  }
}

/**
 * Reset structured extraction state.
 */
export function resetStructuredExtraction(): void {
  _state.extractionSchema = null;
  _state.schemaGenerationState = 'idle';
  _state.structuredResults = [];
  _state.aggregatedData = null;
  _state.renderedReport = null;
  _state.structuredExtractionState = 'idle';
}

// ─── Local Storage Persistence ────────────────────────────────

const STORAGE_KEY = 'weblm-formatter';

interface StoredData {
  sourceContent: string;
  desiredFormat: string;
  selectedModelId: string | null;
  // Worker Pool configuration (Experimental)
  useWorkerPool: boolean;
  workerPoolSize: number;
  workerModelId: string;
}

export function loadFromLocalStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: StoredData = JSON.parse(stored);
      _state.sourceContent = data.sourceContent ?? '';
      _state.desiredFormat = data.desiredFormat ?? '';
      _state.selectedModelId = data.selectedModelId ?? null;
      _state.useWorkerPool = data.useWorkerPool ?? false;
      _state.workerPoolSize = data.workerPoolSize ?? 2;
      _state.workerModelId = data.workerModelId ?? '';
      logger.debug('Loaded formatter state from localStorage');
    }
  } catch (err) {
    logger.error('failed to load formatter state from localStorage:', err);
  }
}

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    logger.error('failed to clear formatter state from localStorage:', err);
  }
}

export function resetFormatterState(): void {
  _state.sourceContent = '';
  _state.desiredFormat = '';
  _state.selectedModelId = null;
  _state.outputResults = [];
  _state.isProcessing = false;
  _state.currentPhase = null;
  _state.refinementState = 'idle';
  _state.refinedChunks = [];
  _state.errorMessage = null;
  _state.extractionState = 'idle';
  _state.extractionResults = [];
  _state.showAllResults = false;
  // Reset worker pool settings but keep the values
  _state.useWorkerPool = false;
  _state.workerPoolSize = 2;
  _state.workerModelId = '';
  // Reset chunk progress tracking
  _state.totalChunks = 0;
  _state.completedChunks = 0;
  _state.chunkPhase = null;
  _state.runStartedAt = null;
  _state.runCompletedAt = null;
  _state.partialRefinedChunks = [];
  _state.partialExtractionResults = [];
  _state.isStopped = false;
  _state.previewMode = 'raw';
  _state.currentChunkIndex = 0;
  resetTaskPlan();
  clearStreamingText();
  invalidateRefinementCache();
  clearLocalStorage();
  // Reset structured extraction state
  _state.extractionSchema = null;
  _state.schemaGenerationState = 'idle';
  _state.structuredResults = [];
  _state.aggregatedData = null;
  _state.renderedReport = null;
  _state.structuredExtractionState = 'idle';
}