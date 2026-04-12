<script lang="ts">
  /**
   * ChatPage component.
   * Full chat experience: header, message list, input, upload, settings.
   * Handles the complete send → stream → display → save flow.
   */

  import ChatMessages from './ChatMessages.svelte';
  import MessageInput from './MessageInput.svelte';
  import Upload, { type UploadedFile } from './Upload.svelte';
  import Metrics, { type GenerationMetrics } from './Metrics.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import { sendMessage, stopGeneration, unloadEngine, getCurrentModel, getIsGenerating } from '../engine/index';
  import { initializeEngine } from '../engine/index';
  import { loadChatMessages, saveChatMessages, clearChatMessages } from '../storage/idb';
  import { getTemperature, getMaxTokens, getTopP, getSystemPrompt, getShowMetrics } from '../settings';
  import { loadMetricsPreference } from '../ui/metrics';
  import { getModelInfo, DEFAULT_MODEL_ID } from '../config';
  import { logger } from '../logger';
  import type { ChatMessage } from '../types';
  import { generateId } from '../types';

  interface Props {
    modelId: string;
    onModelSwitch?: (newModelId: string, displayName: string) => void;
  }

  let { modelId, onModelSwitch }: Props = $props();

  // Chat state
  let messages: ChatMessage[] = $state([]);
  let isGenerating = $state(false);
  let uploadedFile: UploadedFile | null = $state(null);
  let lastMetrics: GenerationMetrics | null = $state(null);
  let showSettings = $state(false);
  let inputRef: MessageInput | undefined = $state();

  // Model display name
  const modelDisplayName = $derived(getModelInfo(modelId)?.displayName ?? modelId);

  // Load chat history on mount
  $effect(() => {
    loadMetricsPreference();
    loadHistory();
  });

  async function loadHistory(): Promise<void> {
    try {
      const saved = await loadChatMessages();
      if (saved && saved.length > 0) {
        messages = saved;
        logger.debug(`loaded ${saved.length} messages from history`);
      }
    } catch (err) {
      logger.error('failed to load chat history:', err);
    }
  }

  async function saveHistory(): Promise<void> {
    try {
      await saveChatMessages(messages);
    } catch (err) {
      logger.error('failed to save chat history:', err);
    }
  }

  async function handleNewChat(): Promise<void> {
    messages = [];
    try {
      await clearChatMessages();
    } catch (err) {
      logger.error('failed to clear chat history:', err);
    }
    lastMetrics = null;
    logger.info('chat cleared');
  }

  async function handleSendMessage(userText: string): Promise<void> {
    if (isGenerating) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    messages = [...messages, userMsg];

    isGenerating = true;

    // Add streaming assistant placeholder
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };
    messages = [...messages, assistantMsg];

    // Build context
    let context: ChatMessage[] = messages.slice(0, -1); // all except placeholder

    const systemPrompt = getSystemPrompt();
    if (systemPrompt.trim()) {
      context = [
        { id: generateId(), role: 'system', content: systemPrompt.trim(), timestamp: new Date().toISOString() },
        ...context,
      ];
    }

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
      uploadedFile = null; // clear after use
    }

    const temperature = getTemperature();
    const maxTokens = getMaxTokens();
    const topP = getTopP();

    // Metrics tracking
    const generationStart = performance.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;

    try {
      await sendMessage(
        context,
        (token) => {
          if (firstTokenTime === null) firstTokenTime = performance.now();
          tokenCount++;

          // Update the streaming message content
          messages = messages.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: m.content + token }
              : m
          );
        },
        (fullResponse) => {
          // Complete the message
          const endTime = performance.now();
          const totalTime = endTime - generationStart;
          const ttft = firstTokenTime ? firstTokenTime - generationStart : 0;
          const tps = tokenCount > 0 && totalTime > 0 ? (tokenCount / totalTime) * 1000 : 0;

          messages = messages.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: fullResponse, streaming: false }
              : m
          );

          isGenerating = false;

          if (getShowMetrics()) {
            lastMetrics = { ttft, totalTime, tokenCount, tokensPerSecond: tps };
          }

          saveHistory();
          inputRef?.focus();
        },
        (error) => {
          logger.error('Generation error:', error);
          messages = messages.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: `Error: ${error.message}`, streaming: false }
              : m
          );
          isGenerating = false;
          saveHistory();
          inputRef?.focus();
        },
        { temperature, maxTokens, topP }
      );
    } catch (error) {
      logger.error('Send message error:', error);
      messages = messages.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, streaming: false }
          : m
      );
      isGenerating = false;
      saveHistory();
      inputRef?.focus();
    }
  }

  function handleStopGeneration(): void {
    stopGeneration();
    // Mark last streaming message as complete
    messages = messages.map(m =>
      m.streaming ? { ...m, streaming: false } : m
    );
    isGenerating = false;
    inputRef?.focus();
  }
</script>

<div class="chat-page">
  <!-- Header -->
  <div class="chat-header">
    <span class="chat-header-title">{modelDisplayName}</span>
    <div class="chat-header-actions">
      <button class="new-chat-btn" title="Start a new conversation" onclick={handleNewChat}>
        + New Chat
      </button>
      <button
        class="settings-button"
        title="Settings"
        aria-label="Open settings"
        onclick={() => { showSettings = true; }}
      >⚙️</button>
    </div>
  </div>

  <!-- Messages -->
  <div class="chat-messages-wrapper">
    <ChatMessages {messages} />
  </div>

  <!-- Metrics -->
  {#if lastMetrics}
    <div class="metrics-wrapper">
      <Metrics metrics={lastMetrics} />
    </div>
  {/if}

  <!-- File info (shown above input when file is attached) -->
  {#if uploadedFile}
    <div class="file-info-bar">
      <Upload
        {uploadedFile}
        onFileLoaded={(f) => { uploadedFile = f; }}
        onFileClear={() => { uploadedFile = null; }}
      />
    </div>
  {/if}

  <!-- Input area -->
  <div class="input-area">
    <Upload
      uploadedFile={null}
      onFileLoaded={(f) => { uploadedFile = f; }}
      onFileClear={() => { uploadedFile = null; }}
    />
    <div class="input-flex">
      <MessageInput
        {isGenerating}
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
        bind:this={inputRef}
      />
    </div>
  </div>
</div>

<!-- Settings panel -->
<SettingsPanel open={showSettings} {messages} onClose={() => { showSettings = false; }} />

<style>
  .chat-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    height: 100%;
    overflow: hidden;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface);
    flex-shrink: 0;
  }

  .chat-header-title {
    font-weight: 600;
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .chat-header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .new-chat-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    font-weight: 500;
    color: var(--color-text);
    background-color: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .new-chat-btn:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
  }

  .settings-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 18px;
    background-color: transparent;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .settings-button:hover {
    background-color: var(--color-border);
  }

  .chat-messages-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .metrics-wrapper {
    padding: 0 var(--spacing-md) var(--spacing-xs);
    flex-shrink: 0;
  }

  .file-info-bar {
    padding: 0 var(--spacing-md);
    flex-shrink: 0;
  }

  .input-area {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-xs);
    padding: 0 var(--spacing-sm);
    background-color: var(--color-surface);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .input-flex {
    flex: 1;
    min-width: 0;
  }

  /* Suppress internal border from MessageInput since we have outer one */
  .input-flex :global(.input-container) {
    border-top: none;
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 0;
  }
</style>
