/**
 * Store domain model types.
 *
 * Centralised type definitions for all reactive stores.
 * Imports base types from existing modules to avoid duplication.
 */

import type { ChatMessage } from '../types';
import type { ModelProgress } from '../engine/types';
import type { Theme } from '../settings';
import type { CohesionAnalysis } from '../lib/formatter/cohesionAnalyzer';

export type { ChatMessage, ModelProgress, Theme, CohesionAnalysis };

// ─── App ──────────────────────────────────────────────────────

export type Screen = 'launcher-home' | 'launcher' | 'chat' | 'formatter';

export interface WebGPUState {
  available: boolean | null;
  reason?: string;
}

export interface AppState {
  screen: Screen;
  online: boolean;
  offlineReady: boolean;
  webgpu: WebGPUState;
}

// ─── Engine ───────────────────────────────────────────────────

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EngineState {
  status: EngineStatus;
  currentModelId: string | null;
  modelDisplayName: string | null;
  progress: ModelProgress | null;
  error: string | null;
  cachedModelIds: Set<string>;
}

// ─── Chat ─────────────────────────────────────────────────────

export interface UploadedFile {
  name: string;
  content: string;
  size: number;
  type: string;
}

export interface GenerationMetrics {
  ttft: number;
  totalTime: number;
  tokenCount: number;
  tokensPerSecond: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  uploadedFile: UploadedFile | null;
  lastMetrics: GenerationMetrics | null;
}

// ─── Settings ─────────────────────────────────────────────────

export interface SettingsState {
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  theme: Theme;
  showMetrics: boolean;
}

// ─── Pipeline Observability ─────────────────────────────────────────

/**
 * Pipeline status for each chunk through refinement stages.
 * Tracks the chunk's progress through: parsing → formatting → analyzing → refining
 */
export type ChunkPipelineStatus = 
  | 'pending'      // chunk created, waiting to be processed
  | 'formatting'   // currently formatting this chunk
  | 'formatted'   // formatting complete
  | 'analyzing'    // currently analyzing cohesion
  | 'analyzed'     // analysis complete
  | 'refining'     // currently refining this chunk
  | 'refined'      // refinement complete
  | 'error';       // an error occurred

/**
 * Pipeline data for a single chunk through the refinement pipeline.
 * Allows observing intermediate outputs at each stage.
 */
export interface ChunkPipelineData {
  /** Chunk position in the array */
  index: number;
  
  // Stage 1: Raw input
  /** Original text from parseIntoChunks() */
  rawText: string;
  /** Estimated token count of raw text */
  rawTokenCount: number;
  
  // Stage 2: Formatted output
  /** Markdown-formatted version of the chunk */
  formattedText: string | null;
  /** Timestamp when formatting completed (ms) */
  formattedAt: number | null;
  
  // Stage 3: Cohesion analysis
  /** Analysis result with this chunk as the first in the pair */
  cohesionWithNext: CohesionAnalysis | null;
  /** Analysis result with this chunk as the second in the pair (from previous chunk's analysis) */
  cohesionWithPrev: CohesionAnalysis | null;
  /** Timestamp when analysis completed (ms) */
  analyzedAt: number | null;
  
  // Stage 4: Refined output
  /** Final refined version after addressing cohesion issues */
  refinedText: string | null;
  /** Timestamp when refinement completed (ms) */
  refinedAt: number | null;
  /** Whether refining made changes vs formatted version */
  wasModified: boolean;
  
  // Status tracking
  /** Current pipeline stage */
  status: ChunkPipelineStatus;
  /** Error message if status is 'error' */
  error: string | null;
}

/**
 * Container for pipeline observability data.
 * Provides visibility into intermediate pipeline outputs.
 */
export interface PipelineObservability {
  /** Pipeline data for each chunk */
  chunks: ChunkPipelineData[];
  /** Currently selected chunk index for inspection panel */
  selectedChunkIndex: number | null;
}

// ─── Chunk Cache ─────────────────────────────────────────────────

/**
 * Single chunk cache entry for incremental caching.
 * Stores refined text for each chunk based on its hash.
 */
export interface ChunkCacheEntry {
  hash: string;
  refinedText: string;
  refinedAt: number;
}


/**
 * Chunk cache map type.
 * Uses Record<number, ...> for Svelte reactivity.
 */
export type ChunkCache = Record<number, ChunkCacheEntry>;

// ─── Formatter ─────────────────────────────────────────────────

export type RefinementState = 'idle' | 'chunking' | 'formatting' | 'analyzing' | 'refining' | 'complete' | 'error';

export type ExtractionState = 'idle' | 'parsing' | 'extracting' | 'complete' | 'error';

export interface TaskPhase {
  name: string;         // e.g., "Formatting", "Analyzing", "Refining"
  totalSteps: number;   // total steps in this phase (e.g., number of chunks)
  completedSteps: number;
  // Timing metrics
  startedAt?: number;      // timestamp when phase started (ms)
  completedAt?: number;     // timestamp when phase completed (ms)
  durationMs?: number;      // calculated duration in ms
}

export interface TaskPlan {
  phases: TaskPhase[];
  currentPhaseIndex: number;  // 0-based
  status: 'idle' | 'running' | 'complete' | 'error';
}

export type RelevanceLevel = 'high' | 'medium' | 'low' | 'none';

export interface ExtractionResult {
  chunkId: number;
  nodeId?: string;
  title?: string;
  content: string;
  relevance: RelevanceLevel;
  reasoning: string;
}

export interface FormatterState {
  sourceContent: string;
  desiredFormat: string;
  outputResults: string[];
  isProcessing: boolean;
  currentPhase: string | null;
  // Model selection
  selectedModelId: string | null;
  // Refinement-related state
  refinementState: RefinementState;
  refinedChunks: string[];
  errorMessage: string | null;
  // Extraction-related state
  extractionState: ExtractionState;
  extractionResults: ExtractionResult[];
  showAllResults: boolean;
  // Worker Pool configuration (Experimental)
  useWorkerPool: boolean;
  workerPoolSize: number;  // 1-4, default 2
  workerModelId: string;   // model to load in workers
  // Chunk progress tracking
  totalChunks: number;           // total chunks detected
  completedChunks: number;       // chunks completed so far
  chunkPhase: string | null;     // current phase label like "Formatting 3/10"
  // Task plan for phase/step tracking
  taskPlan: TaskPlan;
  // Streaming text for live token feedback
  streamingText: string;
  // Cache: hash of source content to detect unchanged content
  sourceContentHash: string | null;
  // Timing metrics for runs
  runStartedAt: number | null;     // timestamp when current/last run started
  runCompletedAt: number | null;    // timestamp when current/last run completed
  // Partial results for progressive output
  partialRefinedChunks: string[];           // completed chunks during refinement
  partialExtractionResults: ExtractionResult[];  // completed extraction results
  // Stop flag for cancellation
  isStopped: boolean;
  // Markdown preview mode
  previewMode: 'raw' | 'preview' | 'chunks';  // current view mode
  currentChunkIndex: number;                    // selected chunk index for preview
  // Pipeline observability data
  pipelineData: PipelineObservability;
  // Incremental chunk cache for resume functionality
  chunkCache: ChunkCache;
  // Per-chunk streaming state
  activeStreamingChunkIndex: number | null;  // which chunk is currently streaming
  activeChunkStreamingText: string;          // accumulated tokens for active chunk
  // Active processing chunk index (for source column highlighting)
  activeProcessingChunkIndex: number | null;
  // Time tracking for ETA
  chunkTimings: number[];  // array of ms durations for completed chunks
  estimatedTimeRemaining: number | null;  // estimated ms remaining
}
