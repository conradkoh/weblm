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

export type Screen = 'launcher' | 'chat';

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
