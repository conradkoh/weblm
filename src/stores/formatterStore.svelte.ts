/**
 * Formatter store — content formatting and extraction state.
 *
 * Manages the source content, desired format instructions,
 * output results, and processing state for the Formatter mini app.
 * Includes source refinement (Phase 2) and extraction (Phase 3).
 */

import { tick } from 'svelte';
import type { FormatterState, RefinementState, ExtractionState, ExtractionResult, ChunkPipelineData, PipelineObservability, ChunkPipelineStatus, CohesionAnalysis } from './types';
import { parseIntoChunks } from '../lib/formatter/chunker';
import { refineChunks, type RefinementResult } from '../lib/formatter/refiner';
import { LocalFormatterBackend } from '../lib/formatter/localBackend';
import type { FormatterBackend } from '../lib/formatter/backend';
import { getModelInfo } from '../config';
import { estimateTokenCount } from '../lib/formatter/tokenizer';
import { processChunks, type ExtractionProgress } from '../lib/formatter/extractionEngine';
import { processPipeline } from '../lib/formatter/pipelineProcessor';
import { getEngineInstance } from '../engine/engine-factory';
import { logger } from '../logger';

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
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive formatter state. */
export function getFormatterState(): FormatterState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

export function setSourceContent(content: string): void {
  _state.sourceContent = content;
  saveToLocalStorage();
}

export function setDesiredFormat(format: string): void {
  _state.desiredFormat = format;
  saveToLocalStorage();
}

export function setSelectedModelId(modelId: string | null): void {
  _state.selectedModelId = modelId;
  saveToLocalStorage();
}

export function addOutputResult(result: string): void {
  _state.outputResults = [..._state.outputResults, result];
}

export function clearOutputResults(): void {
  _state.outputResults = [];
}

export function setOutputResults(results: string[]): void {
  _state.outputResults = results;
}

export function setProcessing(processing: boolean): void {
  _state.isProcessing = processing;
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

export function setExtractionResults(results: ExtractionResult[]): void {
  _state.extractionResults = results;
}

export function setShowAllResults(show: boolean): void {
  _state.showAllResults = show;
}

// Worker Pool configuration setters (Experimental)
export function setUseWorkerPool(use: boolean): void {
  _state.useWorkerPool = use;
  saveToLocalStorage();
}

export function setWorkerPoolSize(size: number): void {
  // Clamp to valid range 1-4
  _state.workerPoolSize = Math.max(1, Math.min(4, size));
  saveToLocalStorage();
}

export function setWorkerModelId(modelId: string): void {
  _state.workerModelId = modelId;
  saveToLocalStorage();
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

export function addPartialExtractionResult(result: ExtractionResult): void {
  _state.partialExtractionResults = [..._state.partialExtractionResults, result];
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
 * Mark a chunk as having an error.
 */
export function setChunkError(index: number, error: string): void {
  const chunks = _state.pipelineData.chunks;
  if (index >= 0 && index < chunks.length) {
    const existing = chunks[index]!;
    const chunk: ChunkPipelineData = {
      ...existing,
      status: 'error',
      error,
    };
    _state.pipelineData.chunks = [
      ...chunks.slice(0, index),
      chunk,
      ...chunks.slice(index + 1),
    ];
  }
}

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

/**
 * Simple hash function for content change detection using djb2 algorithm.
 * 
 * ⚠️ WARNING: For very large content (1MB+), djb2 hash collisions become more likely.
 * This is acceptable for UX caching purposes but not for security.
 * For extra safety, we also store content length alongside hash.
 * 
 * @param content - The content to hash
 * @param contentLength - Optional pre-computed length (avoids re-calculation)
 * @returns A hex string representation of the hash
 */
export function computeContentHash(content: string, contentLength?: number): string {
  const len = contentLength ?? content.length;
  let hash = 5381;
  // Use first and last 1KB plus length for better uniqueness
  const sampleSize = Math.min(1024, len);
  const sample = (len > sampleSize * 2)
    ? content.slice(0, sampleSize) + content.slice(-sampleSize)
    : content;
  
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) + hash) + sample.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Mix in length to differentiate content with same sampled prefix
  hash = ((hash << 5) + hash) + (len % 0xFFFFFFFF);
  hash = hash & hash;
  
  return hash.toString(16);
}

/**
 * Check if content matches stored hash (with length verification).
 * More reliable than hash-only check due to collision protection.
 */
export function isContentCached(content: string, storedHash: string | null, storedLength: number | null): boolean {
  if (!storedHash || !storedLength) return false;
  if (content.length !== storedLength) return false;
  return computeContentHash(content, content.length) === storedHash;
}

/**
 * Get the appropriate formatter backend based on current settings.
 * Priority: Worker Pool > Local
 */
export function getFormatterBackend(): FormatterBackend {
  // Priority 1: Worker Pool (lazy import to avoid bundling issues)
  if (_state.useWorkerPool && _state.workerModelId) {
    logger.info(`Using WorkerPoolFormatterBackend (${_state.workerPoolSize} workers)`);
    const { WorkerPoolFormatterBackend } = require('./workerBackend');
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
    const streamingCallback = (token: string) => {
      appendStreamingToken(token);
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
    
    // Chunk complete callback for progressive output and pipeline observability
    const onChunkComplete = (formattedChunk: string, index: number) => {
      addPartialRefinedChunk(formattedChunk);
      // Update pipeline data with formatting result
      setChunkFormatting(index);
      updateChunkFormatting(index, formattedChunk);
    };
    
    const { formattedChunks, analyses } = await processPipeline(
      chunks,
      backend,
      pipelineProgressHandler,
      streamingCallback,
      onChunkComplete
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
    
    const refinementResult: RefinementResult = await refineChunks(formattedChunks, analyses, backend, { onToken: streamingCallback });
    
    if (refinementResult.success) {
      // Validate chunk sizes (800 tokens max, ~3200 chars)
      const validChunks = refinementResult.refinedChunks.filter(c => {
        return estimateTokenCount(c) <= 800;
      });
      
      // Update pipeline data with refinement results
      for (let i = 0; i < refinementResult.refinedChunks.length; i++) {
        updateChunkRefinement(i, refinementResult.refinedChunks[i] ?? '');
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
    } else {
      // Fall back to formatted chunks if refinement failed
      _state.refinedChunks = formattedChunks;
      // Store content hash for cache
      _state.sourceContentHash = computeContentHash(sourceContent, sourceContent.length);
      _state.runCompletedAt = Date.now();
      updatePhaseProgress(1);
      completeTaskPlan();
      setRefinementState('complete');
      setCurrentPhase(`Formatting complete (${formattedChunks.length} chunks)`);
      logger.warn('Refinement: Refinement failed, using formatted chunks instead');
    }

  } catch (err) {
    _state.runCompletedAt = Date.now();
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Refinement error:', err);
    setErrorMessage(errorMsg);
    setRefinementState('error');
    _state.taskPlan.status = 'error';
    setCurrentPhase(`Error: ${errorMsg}`);
  } finally {
    _state.isProcessing = false;
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
  resetTaskPlan();
  clearStreamingText();
  clearPipelineData();
}

/**
 * Toggle showing all results (including not relevant).
 */
export function toggleShowAllResults(): void {
  _state.showAllResults = !_state.showAllResults;
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

function saveToLocalStorage(): void {
  try {
    const data: StoredData = {
      sourceContent: _state.sourceContent,
      desiredFormat: _state.desiredFormat,
      selectedModelId: _state.selectedModelId,
      useWorkerPool: _state.useWorkerPool,
      workerPoolSize: _state.workerPoolSize,
      workerModelId: _state.workerModelId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    logger.error('failed to save formatter state to localStorage:', err);
  }
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
      logger.debug('loaded formatter state from localStorage');
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
}