/**
 * Store domain model types.
 *
 * Centralised type definitions for all reactive stores.
 * Imports base types from existing modules to avoid duplication.
 */

import type { ChatMessage } from '../types';
import type { ModelProgress } from '../engine/types';
import type { Theme } from '../settings';

export type { ChatMessage, ModelProgress, Theme };

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

// ─── Formatter ─────────────────────────────────────────────────

export type RefinementState = 'idle' | 'chunking' | 'formatting' | 'analyzing' | 'refining' | 'complete' | 'error';

export type ExtractionState = 'idle' | 'parsing' | 'extracting' | 'complete' | 'error';

export interface TaskPhase {
  name: string;         // e.g., "Formatting", "Analyzing", "Refining"
  totalSteps: number;   // total steps in this phase (e.g., number of chunks)
  completedSteps: number;
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
}
