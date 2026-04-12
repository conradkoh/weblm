<script lang="ts">
  /**
   * StatusBar component.
   * Reads WebGPU, online, model, and offline-ready status directly from stores.
   */

  import { getAppState } from '../stores/appStore.svelte';
  import { getEngineState } from '../stores/engineStore.svelte';

  const appState = getAppState();
  const engineState = getEngineState();
</script>

<div
  class="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-shrink-0"
  role="status"
  aria-live="polite"
  aria-label="Application status"
>
  <!-- WebGPU status -->
  <div
    class="flex items-center gap-1 text-sm"
    id="webgpu-status"
    aria-label="WebGPU status"
    title={appState.webgpu.available === false ? (appState.webgpu.reason ?? 'WebGPU is not available') : ''}
  >
    {#if appState.webgpu.available === null}
      <span class="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400 dark:bg-slate-500 status-dot-pulse" aria-hidden="true"></span>
      <span>Checking WebGPU...</span>
    {:else if appState.webgpu.available}
      <span class="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" aria-hidden="true"></span>
      <span>WebGPU Available</span>
    {:else}
      <span class="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" aria-hidden="true"></span>
      <span>WebGPU Unavailable</span>
    {/if}
  </div>

  <!-- Online/offline status -->
  <div class="flex items-center gap-1 text-sm" id="online-status" aria-label="Connection status">
    <span
      class="w-2 h-2 rounded-full flex-shrink-0 {appState.online ? 'bg-green-500' : 'bg-red-500'}"
      aria-hidden="true"
    ></span>
    <span>{appState.online ? 'Online' : 'Offline'}</span>
  </div>

  <!-- Offline ready badge -->
  {#if appState.offlineReady}
    <div class="flex items-center gap-1 text-sm" id="offline-ready-status" title="App is cached and can work offline">
      <span class="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" aria-hidden="true"></span>
      <span>Offline Ready ✓</span>
    </div>
  {/if}

  <!-- Model status -->
  {#if engineState.status === 'loading' || engineState.status === 'ready'}
    <div class="flex items-center gap-1 text-sm" id="model-status" aria-label="Model status">
      {#if engineState.status === 'loading'}
        <span class="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400 dark:bg-slate-500 status-dot-pulse" aria-hidden="true"></span>
        <span>Loading model...</span>
      {:else}
        <span class="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" aria-hidden="true"></span>
        <span>Model: {engineState.modelDisplayName}</span>
      {/if}
    </div>
  {/if}
</div>
