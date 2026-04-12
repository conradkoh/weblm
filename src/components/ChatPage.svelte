<script lang="ts">
  /**
   * ChatPage component.
   * Full chat experience: header, message list, input, upload, settings.
   * All chat state and logic lives in chatStore — this component is a thin view layer.
   */

  import ChatMessages from './ChatMessages.svelte';
  import MessageInput from './MessageInput.svelte';
  import Upload from './Upload.svelte';
  import Metrics from './Metrics.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import {
    getChatState,
    loadHistory,
    clearChat,
    sendMessage,
    stopGeneration,
    setUploadedFile,
    clearUploadedFile,
  } from '../stores/chatStore.svelte';
  import { getEngineState } from '../stores/engineStore.svelte';

  interface Props {
    modelId: string;
  }

  let { modelId }: Props = $props();

  const chatState = getChatState();
  const engineState = getEngineState();

  // UI-only state (not in stores)
  let showSettings = $state(false);
  let inputRef: MessageInput | undefined = $state();

  // Model display name from engine store
  const modelDisplayName = $derived(engineState.modelDisplayName ?? modelId);

  // Load history on mount
  $effect(() => {
    loadHistory();
  });

  async function handleNewChat(): Promise<void> {
    await clearChat();
  }

  async function handleSendMessage(userText: string): Promise<void> {
    await sendMessage(userText);
    inputRef?.focus();
  }

  function handleStopGeneration(): void {
    stopGeneration();
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
    <ChatMessages messages={chatState.messages} />
  </div>

  <!-- Metrics -->
  {#if chatState.lastMetrics}
    <div class="metrics-wrapper">
      <Metrics metrics={chatState.lastMetrics} />
    </div>
  {/if}

  <!-- Input area -->
  <div class="input-area">
    <Upload
      uploadedFile={chatState.uploadedFile}
      onFileLoaded={(f) => setUploadedFile(f)}
      onFileClear={() => clearUploadedFile()}
    />
    <div class="input-flex">
      <MessageInput
        isGenerating={chatState.isGenerating}
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
        bind:this={inputRef}
      />
    </div>
  </div>
</div>

<!-- Settings panel -->
<SettingsPanel
  open={showSettings}
  messages={chatState.messages}
  onClose={() => { showSettings = false; }}
/>

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
