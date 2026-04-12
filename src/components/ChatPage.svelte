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
  import { setScreen } from '../stores/appStore.svelte';
  import { Button } from '$ui/button';
  import { Separator } from '$ui/separator';

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
  <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-slate-800 flex-shrink-0">
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        title="Go to apps"
        aria-label="Go back to app launcher"
        onclick={() => { setScreen('launcher-home'); }}
      >
        🏠
      </Button>
      <span class="font-semibold text-gray-900 dark:text-slate-100 text-sm">{modelDisplayName}</span>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        title="Start a new conversation"
        onclick={handleNewChat}
      >
        + New Chat
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Settings"
        aria-label="Open settings"
        onclick={() => { showSettings = true; }}
      >⚙️</Button>
    </div>
  </div>
  <Separator />

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
  <Separator />
  <div class="flex items-end gap-1 px-2 bg-gray-50 dark:bg-slate-800 flex-shrink-0">
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
