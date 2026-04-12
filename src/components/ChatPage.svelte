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

<div class="flex-1 flex flex-col w-full max-w-[800px] mx-auto h-full overflow-hidden">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex-shrink-0">
    <span class="font-semibold text-gray-900 dark:text-slate-100 text-sm">{modelDisplayName}</span>
    <div class="flex items-center gap-2">
      <button
        class="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium font-[inherit] text-gray-900 dark:text-slate-100 bg-transparent border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400"
        title="Start a new conversation"
        onclick={handleNewChat}
      >
        + New Chat
      </button>
      <button
        class="flex items-center justify-center w-8 h-8 p-0 text-lg bg-transparent border-none rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-slate-700"
        title="Settings"
        aria-label="Open settings"
        onclick={() => { showSettings = true; }}
      >⚙️</button>
    </div>
  </div>

  <!-- Messages -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <ChatMessages messages={chatState.messages} />
  </div>

  <!-- Metrics -->
  {#if chatState.lastMetrics}
    <div class="px-4 pb-1 flex-shrink-0">
      <Metrics metrics={chatState.lastMetrics} />
    </div>
  {/if}

  <!-- Input area -->
  <div class="flex items-end gap-1 px-2 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
    <Upload
      uploadedFile={chatState.uploadedFile}
      onFileLoaded={(f) => setUploadedFile(f)}
      onFileClear={() => clearUploadedFile()}
    />
    <div class="flex-1 min-w-0">
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
