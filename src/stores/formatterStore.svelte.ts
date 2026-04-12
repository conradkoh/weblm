/**
 * Formatter store — content formatting and extraction state.
 *
 * Manages the source content, desired format instructions,
 * output results, and processing state for the Formatter mini app.
 * Includes source refinement (Phase 2) and extraction (Phase 3).
 */

import { tick } from 'svelte';
import type { FormatterState, RefinementState, ExtractionState, ExtractionResult } from './types';
import { parseIntoChunks } from '../lib/formatter/chunker';
import { refineChunks, type RefinementResult } from '../lib/formatter/refiner';
import { LocalFormatterBackend } from '../lib/formatter/localBackend';
import type { FormatterBackend } from '../lib/formatter/backend';
import { getModelInfo } from '../config';
import { estimateTokenCount } from '../lib/formatter/tokenizer';
import { processChunks, type ExtractionProgress } from '../lib/formatter/extractionEngine';
import { processPipeline, createPipelineProgressHandler } from '../lib/formatter/pipelineProcessor';
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
  _state.taskPlan = {
    phases: phases.map(p => ({ ...p, completedSteps: 0 })),
    currentPhaseIndex: 0,
    status: 'running',
  };
}

export function advancePhase(): void {
  if (_state.taskPlan.currentPhaseIndex < _state.taskPlan.phases.length - 1) {
    _state.taskPlan.currentPhaseIndex++;
  }
}

export function updatePhaseProgress(completedSteps: number): void {
  const phase = _state.taskPlan.phases[_state.taskPlan.currentPhaseIndex];
  if (phase) {
    phase.completedSteps = completedSteps;
  }
}

export function completeTaskPlan(): void {
  _state.taskPlan.status = 'complete';
}

export function resetTaskPlan(): void {
  _state.taskPlan = { phases: [], currentPhaseIndex: 0, status: 'idle' };
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
 */
export async function runRefinement(): Promise<void> {
  const { sourceContent } = _state;
  // Get backend based on settings (cloud or local)
  const backend = getFormatterBackend();
  const concurrency = backend.recommendedConcurrency();

  if (!sourceContent.trim()) {
    setErrorMessage('Source content is empty');
    setRefinementState('error');
    return;
  }

  _state.isProcessing = true;
  _state.errorMessage = null;
  _state.refinedChunks = [];

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
    
    // Enhanced progress handler that updates chunk progress and task plan
    const pipelineProgressHandler = async (progress: { phase: string; formatted: number; analyzed: number; total: number; message: string }) => {
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
    
    const { formattedChunks, analyses } = await processPipeline(
      chunks,
      backend,
      pipelineProgressHandler
    );
    
    logger.info(`Refinement: Pipeline complete with ${formattedChunks.length} chunks and ${analyses.length} analyses`);
    
    const issuesFound = analyses.filter(a => a.hasIssues).length;
    logger.info(`Refinement: Found ${issuesFound} pairs with cohesion issues`);

    // Step 4: Refine chunks based on cohesion analysis
    setRefinementState('refining');
    setCurrentPhase('Refining chunks based on analysis...');
    logger.info('Refinement: Starting chunk refinement');
    
    const refinementResult: RefinementResult = await refineChunks(formattedChunks, analyses, backend);
    
    if (refinementResult.success) {
      // Validate chunk sizes (800 tokens max, ~3200 chars)
      const validChunks = refinementResult.refinedChunks.filter(c => {
        return estimateTokenCount(c) <= 800;
      });
      
      _state.refinedChunks = validChunks;
      updatePhaseProgress(1);
      completeTaskPlan();
      setRefinementState('complete');
      setCurrentPhase(`Refinement complete: ${validChunks.length} refined chunks`);
      logger.info(`Refinement: Complete with ${validChunks.length} refined chunks`);
    } else {
      // Fall back to formatted chunks if refinement failed
      _state.refinedChunks = formattedChunks;
      updatePhaseProgress(1);
      completeTaskPlan();
      setRefinementState('complete');
      setCurrentPhase(`Formatting complete (${formattedChunks.length} chunks)`);
      logger.warn('Refinement: Refinement failed, using formatted chunks instead');
    }

  } catch (err) {
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
  _state.errorMessage = null;
  _state.currentPhase = null;
  _state.totalChunks = 0;
  _state.completedChunks = 0;
  _state.chunkPhase = null;
  resetTaskPlan();
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

  try {
    setExtractionState('parsing');
    setCurrentPhase('Parsing refined chunks...');
    logger.info('Extraction: Starting');

    const results = await processChunks(
      refinedChunks,
      desiredFormat,
      { concurrency },
      (progress: ExtractionProgress) => {
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

    _state.extractionResults = results;
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
  _state.showAllResults = false;
  _state.totalChunks = 0;
  _state.completedChunks = 0;
  _state.chunkPhase = null;
  resetTaskPlan();
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
  resetTaskPlan();
  clearLocalStorage();
}