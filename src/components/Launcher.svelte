<script lang="ts">
  /**
   * Launcher component.
   * The model selection and loading screen shown on first visit.
   */

  import ModelSelector from './ModelSelector.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import { checkModelCached, getStorageEstimate, getStorageStatus } from '../storage/index';
  import { initializeEngine, deleteCachedModel, getCurrentModel } from '../engine/index';
  import { getModelInfo, DEFAULT_MODEL_ID, getModelCatalog } from '../config';
  import { logger } from '../logger';
  import type { ModelProgress, ProgressCallback } from '../engine/types';

  interface Props {
    onModelLoaded: (modelId: string) => void;
  }

  let { onModelLoaded }: Props = $props();

  // State
  let selectedModelId = $state(DEFAULT_MODEL_ID);
  let cachedModelIds = $state(new Set<string>());
  let isLoading = $state(false);
  let progress: ModelProgress | null = $state(null);
  let loadError: string | null = $state(null);
  let storageStatus = $state('');

  // Derived: button label
  const loadButtonText = $derived(
    isLoading
      ? (progress?.phase === 'downloading' ? 'Downloading...' : 'Loading...')
      : cachedModelIds.has(selectedModelId)
        ? '✓ Cached — Load Instantly'
        : 'Download & Load'
  );

  // Load storage status and cached model list on mount
  $effect(() => {
    getStorageStatus().then(s => { storageStatus = s; });
    refreshCachedModels();
  });

  async function refreshCachedModels(): Promise<void> {
    const catalog = getModelCatalog();
    const ids = new Set<string>();
    await Promise.all(
      catalog.map(async info => {
        if (await checkModelCached(info.modelId)) ids.add(info.modelId);
      })
    );
    cachedModelIds = ids;
  }

  async function handleLoad(): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    loadError = null;
    progress = null;

    const modelInfo = getModelInfo(selectedModelId);
    const displayName = modelInfo?.displayName ?? selectedModelId;

    // Check storage if not cached
    if (!cachedModelIds.has(selectedModelId)) {
      const storage = await getStorageEstimate();
      const requiredSpace = (modelInfo?.vramMB ?? 0) * 1024 * 1024 * 1.5;
      if (requiredSpace > 0 && storage.available < requiredSpace) {
        const sizeStr = modelInfo?.sizeGB ? `${modelInfo.sizeGB} GB` : 'the model';
        alert(
          `Not enough storage space. Need ~${sizeStr}, but only ${Math.round(storage.available / 1024 / 1024 / 1024)}GB available.`
        );
        isLoading = false;
        return;
      }
    }

    const onProgress: ProgressCallback = (p) => {
      progress = p;
    };

    try {
      await initializeEngine(selectedModelId, onProgress);
      isLoading = false;
      onModelLoaded(selectedModelId);
      logger.info(`Model ${selectedModelId} loaded successfully`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Model loading failed:', msg);
      loadError = `Failed to load model: ${msg}`;
      isLoading = false;
    }
  }

  async function handleClearCache(): Promise<void> {
    const info = getModelInfo(selectedModelId);
    const name = info?.displayName ?? selectedModelId;
    if (confirm(`Clear cache for ${name}? You'll need to download it again next time.`)) {
      await deleteCachedModel(selectedModelId);
      location.reload();
    }
  }

  function handleRetry(): void {
    loadError = null;
    progress = null;
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

    <!-- Progress bar (shown while loading) -->
    {#if isLoading || loadError}
      <ProgressBar {progress} error={loadError} onRetry={loadError ? handleRetry : undefined} />
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

  /* Global button styles needed here (not scoped to component) */
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

  :global(.button:hover) {
    background-color: #4338ca;
  }

  :global(.button:active) {
    transform: scale(0.98);
  }

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

  :global(.button-secondary:hover) {
    background-color: var(--color-border);
  }
</style>
