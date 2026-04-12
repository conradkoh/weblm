<script lang="ts">
  /**
   * App — root Svelte component.
   *
   * Thin orchestration layer: delegates all state to stores.
   * onMount calls appStore.init() which handles theme, WebGPU, SW, etc.
   */

  import { onMount } from 'svelte';
  import StatusBar from './components/StatusBar.svelte';
  import Launcher from './components/Launcher.svelte';
  import ChatPage from './components/ChatPage.svelte';
  import { getAppState, init as appInit } from './stores/appStore.svelte';
  import { getEngineState } from './stores/engineStore.svelte';
  import { WEBGPU_BROWSER_RECOMMENDATIONS } from './engine/webgpu-check';

  const appState = getAppState();
  const engineState = getEngineState();

  onMount(() => {
    appInit();
  });

  // handleModelLoaded is a no-op — engine store drives screen transition
  function handleModelLoaded(_modelId: string): void {}
</script>

<div id="app-root" class="min-h-screen flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
  <StatusBar />

  <main class="flex-1 flex flex-col">
    {#if appState.webgpu.available === false}
      <!-- WebGPU not available error screen -->
      <h1 class="text-2xl font-semibold mb-4 p-6">WebLM — Local AI Chat</h1>
      <div class="border border-red-500 rounded-lg p-4 mx-6 mb-6 max-w-lg bg-red-50 dark:bg-red-950">
        <h3 class="text-red-500 font-semibold mb-2">⚠️ WebGPU Not Available</h3>
        <p>{appState.webgpu.reason ?? 'WebGPU is required for this application to run.'}</p>
        <p class="mt-2">Supported browsers:</p>
        <ul class="ml-4 mt-2">
          {#each WEBGPU_BROWSER_RECOMMENDATIONS as browser (browser)}
            <li class="text-gray-500 dark:text-slate-400 my-1">{browser}</li>
          {/each}
        </ul>
        <p class="mt-2">If you're using a supported browser, ensure hardware acceleration is enabled.</p>
      </div>

    {:else if appState.screen === 'launcher'}
      <Launcher onModelLoaded={handleModelLoaded} />

    {:else if appState.screen === 'chat'}
      <ChatPage modelId={engineState.currentModelId ?? ''} />
    {/if}
  </main>
</div>
