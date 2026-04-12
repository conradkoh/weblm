/**
 * Chat store — conversation and streaming state.
 *
 * Manages: message list, generating flag, uploaded file, generation metrics.
 */

import type { ChatState, ChatMessage, UploadedFile, GenerationMetrics } from './types';

const _state = $state<ChatState>({
  messages: [],
  isGenerating: false,
  uploadedFile: null,
  lastMetrics: null,
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive chat state (read-only reference). */
export function getChatState(): ChatState {
  return _state;
}

// ─── Message mutations ────────────────────────────────────────

/** Replace the entire message list (e.g. after loading from IndexedDB). */
export function setMessages(_messages: ChatMessage[]): void {
  // TODO: implement
}

/** Append a single message. */
export function addMessage(_message: ChatMessage): void {
  // TODO: implement
}

/** Update a message by ID (e.g. append streaming token). */
export function updateMessage(_id: string, _patch: Partial<ChatMessage>): void {
  // TODO: implement
}

/** Clear all messages. */
export function clearMessages(): void {
  // TODO: implement
}

// ─── Generation state ─────────────────────────────────────────

/** Mark generation as started. */
export function setGenerating(_generating: boolean): void {
  // TODO: implement
}

/** Record generation metrics after completion. */
export function setLastMetrics(_metrics: GenerationMetrics | null): void {
  // TODO: implement
}

// ─── File upload ──────────────────────────────────────────────

/** Set the currently attached file. */
export function setUploadedFile(_file: UploadedFile | null): void {
  // TODO: implement
}
