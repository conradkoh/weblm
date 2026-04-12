/**
 * Chat store — conversation, streaming, file upload, and metrics state.
 *
 * Encapsulates the full send/stream/complete flow so ChatPage.svelte
 * only needs thin wrappers calling into this store.
 */

import type { ChatState, ChatMessage, UploadedFile, GenerationMetrics } from './types';
import { getSettingsState } from './settingsStore.svelte';
import { sendMessage as engineSend, stopGeneration as engineStop } from '../engine/index';
import { loadChatMessages, saveChatMessages, clearChatMessages } from '../storage/idb';
import { generateId } from '../types';
import { logger } from '../logger';

// ─── State ────────────────────────────────────────────────────

const _state = $state<ChatState>({
  messages: [],
  isGenerating: false,
  uploadedFile: null,
  lastMetrics: null,
});

// ─── Derived ─────────────────────────────────────────────────

const _messageCount = $derived(_state.messages.length);
const _hasMessages = $derived(_state.messages.length > 0);

export function messageCount(): number { return _messageCount; }
export function hasMessages(): boolean { return _hasMessages; }

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive chat state. */
export function getChatState(): ChatState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

export function setMessages(messages: ChatMessage[]): void {
  _state.messages = messages;
}

export function addMessage(message: ChatMessage): void {
  _state.messages = [..._state.messages, message];
}

export function updateMessage(id: string, patch: Partial<ChatMessage>): void {
  _state.messages = _state.messages.map(m =>
    m.id === id ? { ...m, ...patch } : m
  );
}

export function clearMessages(): void {
  _state.messages = [];
}

export function setGenerating(generating: boolean): void {
  _state.isGenerating = generating;
}

export function setLastMetrics(metrics: GenerationMetrics | null): void {
  _state.lastMetrics = metrics;
}

export function setUploadedFile(file: UploadedFile | null): void {
  _state.uploadedFile = file;
}

export function clearUploadedFile(): void {
  _state.uploadedFile = null;
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Load chat history from IndexedDB.
 */
export async function loadHistory(): Promise<void> {
  try {
    const saved = await loadChatMessages();
    if (saved && saved.length > 0) {
      _state.messages = saved;
      logger.debug(`loaded ${saved.length} messages from history`);
    }
  } catch (err) {
    logger.error('failed to load chat history:', err);
  }
}

/**
 * Save chat history to IndexedDB.
 */
export async function saveHistory(): Promise<void> {
  try {
    await saveChatMessages(_state.messages);
  } catch (err) {
    logger.error('failed to save chat history:', err);
  }
}

/**
 * Clear all messages and wipe IndexedDB history.
 */
export async function clearChat(): Promise<void> {
  _state.messages = [];
  _state.lastMetrics = null;
  try {
    await clearChatMessages();
  } catch (err) {
    logger.error('failed to clear chat history:', err);
  }
  logger.info('chat cleared');
}

/**
 * Stop the current generation and mark the last streaming message as complete.
 */
export function stopGeneration(): void {
  engineStop();
  _state.messages = _state.messages.map(m =>
    m.streaming ? { ...m, streaming: false } : m
  );
  _state.isGenerating = false;
}

/**
 * Send a user message and stream the assistant response.
 * Reads generation settings from settingsStore.
 */
export async function sendMessage(userText: string): Promise<void> {
  if (_state.isGenerating) return;

  // Add user message
  const userMsg: ChatMessage = {
    id: generateId(),
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
  };
  _state.messages = [..._state.messages, userMsg];
  _state.isGenerating = true;

  // Add streaming assistant placeholder
  const assistantMsg: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
    streaming: true,
  };
  _state.messages = [..._state.messages, assistantMsg];

  // Build context from current messages (all except the placeholder)
  const settings = getSettingsState();
  let context: ChatMessage[] = _state.messages.slice(0, -1);

  if (settings.systemPrompt.trim()) {
    context = [
      { id: generateId(), role: 'system', content: settings.systemPrompt.trim(), timestamp: new Date().toISOString() },
      ...context,
    ];
  }

  const uploadedFile = _state.uploadedFile;
  if (uploadedFile) {
    context = [
      {
        id: generateId(),
        role: 'system',
        content: `The user has uploaded a file named "${uploadedFile.name}". Here is its content:\n\n${uploadedFile.content}`,
        timestamp: new Date().toISOString(),
      },
      ...context,
    ];
    _state.uploadedFile = null; // clear after use
  }

  // Metrics tracking
  const generationStart = performance.now();
  let firstTokenTime: number | null = null;
  let tokenCount = 0;

  try {
    await engineSend(
      context,
      (token) => {
        if (firstTokenTime === null) firstTokenTime = performance.now();
        tokenCount++;
        _state.messages = _state.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: m.content + token }
            : m
        );
      },
      (fullResponse) => {
        const endTime = performance.now();
        const totalTime = endTime - generationStart;
        const ttft = firstTokenTime ? firstTokenTime - generationStart : 0;
        const tps = tokenCount > 0 && totalTime > 0 ? (tokenCount / totalTime) * 1000 : 0;

        _state.messages = _state.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: fullResponse, streaming: false }
            : m
        );
        _state.isGenerating = false;

        if (settings.showMetrics) {
          _state.lastMetrics = { ttft, totalTime, tokenCount, tokensPerSecond: tps };
        }

        saveHistory();
      },
      (error) => {
        logger.error('Generation error:', error);
        _state.messages = _state.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${error.message}`, streaming: false }
            : m
        );
        _state.isGenerating = false;
        saveHistory();
      },
      {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
      }
    );
  } catch (error) {
    logger.error('Send message error:', error);
    _state.messages = _state.messages.map(m =>
      m.id === assistantMsg.id
        ? { ...m, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, streaming: false }
        : m
    );
    _state.isGenerating = false;
    saveHistory();
  }
}
