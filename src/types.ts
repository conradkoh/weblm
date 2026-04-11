/**
 * Shared application types.
 *
 * Common type definitions shared across
 * engine, storage, and UI modules.
 */

import type { ModelState, ModelVariant } from './engine/types';

/**
 * Chat message role.
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Chat message representation.
 * Compatible with WebLLM/OpenAI chat format.
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Role: user, assistant, or system */
  role: MessageRole;
  /** Message content (text) */
  content: string;
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Whether this message is still streaming */
  streaming?: boolean;
}

/**
 * Application state.
 */
export interface AppState {
  /** Current model loading state */
  modelState: ModelState;
  /** Loaded model variant */
  loadedModel: ModelVariant | null;
  /** All chat messages */
  messages: ChatMessage[];
  /** Whether a response is being generated */
  isGenerating: boolean;
  /** Any error message to display */
  error: string | null;
  /** Whether offline mode is active */
  offlineMode: boolean;
}

/**
 * Generation options for a single prompt.
 */
export interface GenerationOptions {
  /** Temperature override */
  temperature?: number;
  /** Max tokens override */
  maxTokens?: number;
  /** System prompt to prepend */
  systemPrompt?: string;
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}