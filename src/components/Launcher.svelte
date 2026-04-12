<script lang="ts">
  /**
   * Launcher component.
   * The model selection and loading screen.
   * Reads loading/caching state from engineStore; selectedModelId is local UI state.
   */

  import ModelSelector from './ModelSelector.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import {
    getEngineState,
    loadModel,
    deleteCachedModel,
    refreshCachedModels,
    getStorageInfo,
  } from '../stores/engineStore.svelte';
  import { DEFAULT_MODEL_ID } from '../config';

  interface Props {
    onModelLoaded: (modelId: string) => void;
  }

  let { onModelLoaded }: Props = $props();

  const engineState = getEngineState();

  // UI-only: which model is selected in the dropdown
  let selectedModelId = $state(DEFAULT_MODEL_ID);
  let storageStatus = $state('');

  // Derived from engine store
  const isLoading = $derived(engineState.status === 'loading');
  const loadError = $derived(engineState.status === 'error' ? engineState.error : null);
  const cachedModelIds = $derived(engineState.cachedModelIds);

  const loadButtonText = $derived(
    isLoading
      ? (engineState.progress?.phase === 'downloading' ? 'Downloading...' : 'Loading...')
      : cachedModelIds.has(selectedModelId)
        ? '✓ Cached — Load Instantly'
        : 'Download & Load'
  );

  // Initialize: load cached models and storage status
  $effect(() => {
    getStorageInfo().then(s => { storageStatus = s; });
    refreshCachedModels();
  });

  async function handleLoad(): Promise<void> {
    if (isLoading) return;

    const success = await loadModel(selectedModelId);
    if (success) {
      onModelLoaded(selectedModelId);
    }
  }

  async function handleClearCache(): Promise<void> {
    const { getModelInfo } = await import('../config');
    const info = getModelInfo(selectedModelId);
    const name = info?.displayName ?? selectedModelId;
    if (confirm(`Clear cache for ${name}? You'll need to download it again next time.`)) {
      await deleteCachedModel(selectedModelId);
      location.reload();
    }
  }

  function handleRetry(): void {
    handleLoad();
  }
</script>

<div class="flex items-center justify-center min-h-full px-6 py-8">
  <div class="w-full max-w-[480px] flex flex-col gap-6">
    <!-- Hero -->
    <div class="text-center pb-2">
      <div class="text-5xl leading-none mb-2">🧠</div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-slate-100 m-0 mb-1">WebLM</h1>
      <p class="text-base text-gray-500 dark:text-slate-400 m-0">Local AI Chat — Private &amp; Fast</p>
    </div>

    <!-- Storage status -->
    {#if storageStatus}
      <p class="text-center text-sm text-gray-500 dark:text-slate-400 opacity-80 -mt-4">{storageStatus}</p>
    {/if}

    <!-- Model selector -->
    <ModelSelector
      {cachedModelIds}
      bind:selectedModelId
      onModelSelect={(id) => { selectedModelId = id; }}
    />

    <!-- Progress bar (shown while loading or on error) -->
    {#if isLoading || loadError}
      <ProgressBar
        progress={engineState.progress}
        error={loadError}
        onRetry={loadError ? handleRetry : undefined}
      />
    {/if}

    <!-- Action buttons -->
    <div class="flex flex-col gap-2">
      <button
        class="btn w-full py-3 px-6 text-base font-semibold"
        id="load-button"
        disabled={isLoading}
        aria-label="Load selected model"
        onclick={handleLoad}
      >
        {loadButtonText}
      </button>

      {#if cachedModelIds.has(selectedModelId) && !isLoading}
        <button
          class="btn btn-secondary"
          id="clear-button"
          aria-label="Clear cached model"
          onclick={handleClearCache}
        >
          Clear Cache
        </button>
      {/if}
    </div>
  </div>
</div>
