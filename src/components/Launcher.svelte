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
  import { logger } from '../logger';

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

<div class="launcher-screen">
  <div class="launcher-card">
    <!-- Hero -->
    <div class="launcher-hero">
      <div class="launcher-logo">🧠</div>
      <h1 class="launcher-title">WebLM</h1>
      <p class="launcher-subtitle">Local AI Chat — Private &amp; Fast</p>
    </div>

    <!-- Storage status -->
    {#if storageStatus}
      <p class="launcher-storage">{storageStatus}</p>
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
    <div class="launcher-buttons">
      <button
        class="button launcher-load-btn"
        id="load-button"
        disabled={isLoading}
        aria-label="Load selected model"
        onclick={handleLoad}
      >
        {loadButtonText}
      </button>

      {#if cachedModelIds.has(selectedModelId) && !isLoading}
        <button
          class="button button-secondary"
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

<style>
  .launcher-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  .launcher-card {
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .launcher-hero {
    text-align: center;
    padding-bottom: var(--spacing-sm);
  }

  .launcher-logo {
    font-size: 3rem;
    line-height: 1;
    margin-bottom: var(--spacing-sm);
  }

  .launcher-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--spacing-xs) 0;
  }

  .launcher-subtitle {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .launcher-storage {
    text-align: center;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    opacity: 0.8;
    margin-top: calc(-1 * var(--spacing-md));
  }

  .launcher-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .launcher-load-btn {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-base);
    font-weight: 600;
  }

  /* Global button styles */
  :global(.button) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    font-family: inherit;
    line-height: 1.5;
    color: white;
    background-color: var(--color-primary);
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.15s ease, transform 0.1s ease;
  }

  :global(.button:hover) { background-color: #4338ca; }
  :global(.button:active) { transform: scale(0.98); }
  :global(.button:disabled) {
    background-color: var(--color-text-secondary);
    cursor: not-allowed;
    opacity: 0.7;
  }
  :global(.button-secondary) {
    background-color: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }
  :global(.button-secondary:hover) { background-color: var(--color-border); }
</style>
