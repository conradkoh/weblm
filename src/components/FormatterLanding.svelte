<script lang="ts">
  /**
   * FormatterLanding component.
   * Landing page for the Formatter mini app - shown before model is loaded.
   * Handles model selection and loading.
   */
  import { Button } from '$ui/button';
  import ModelSelector from './ModelSelector.svelte';
  import { getEngineState, loadModel } from '../stores/engineStore.svelte';
  import { getFormatterState, setSelectedModelId } from '../stores/formatterStore.svelte';

  interface Props {
    onModelLoaded: () => void;
  }

  let { onModelLoaded }: Props = $props();

  const engineState = getEngineState();
  const formatterState = getFormatterState();

  // Local state for landing page
  let isLoadingModel = $state(false);
  let loadingError = $state<string | null>(null);

  // Check if selected model is cached
  const isCached = $derived(
    formatterState.selectedModelId !== null &&
    engineState.cachedModelIds.has(formatterState.selectedModelId)
  );

  function handleModelSelect(modelId: string): void {
    setSelectedModelId(modelId);
  }

  async function handleStart(): Promise<void> {
    if (!formatterState.selectedModelId) {
      loadingError = 'Please select a model first';
      return;
    }

    isLoadingModel = true;
    loadingError = null;

    try {
      const success = await loadModel(formatterState.selectedModelId, { skipScreenTransition: true });
      
      if (success) {
        onModelLoaded();
      } else {
        loadingError = engineState.error ?? 'Failed to load model';
      }
    } catch (err) {
      loadingError = err instanceof Error ? err.message : 'Failed to load model';
    } finally {
      isLoadingModel = false;
    }
  }
</script>

<div class="flex flex-col items-center justify-center min-h-full p-8 bg-gray-50 dark:bg-slate-900">
  <div class="w-full max-w-lg space-y-8">
    <!-- Header -->
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-slate-100">
        📝 Formatter
      </h1>
      <p class="text-gray-600 dark:text-slate-400">
        Transform unstructured content into structured, refined data using AI.
        Select a model below to get started.
      </p>
    </div>

    <!-- Model Selection -->
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
      <ModelSelector
        cachedModelIds={engineState.cachedModelIds}
        selectedModelId={formatterState.selectedModelId ?? ''}
        onModelSelect={handleModelSelect}
      />

      <!-- Error message -->
      {#if loadingError}
        <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p class="text-sm text-red-600 dark:text-red-400">{loadingError}</p>
        </div>
      {/if}

      <!-- Start Button -->
      <div class="mt-6">
        <Button
          variant="default"
          size="lg"
          class="w-full"
          disabled={!formatterState.selectedModelId || isLoadingModel}
          onclick={handleStart}
        >
          {#if isLoadingModel}
            <span class="flex items-center gap-2">
              <span class="animate-spin">⏳</span>
              Loading model...
            </span>
          {:else if isCached}
            <span class="flex items-center gap-2">
              <span>▶</span>
              Start Formatter (cached)
            </span>
          {:else}
            <span class="flex items-center gap-2">
              <span>▶</span>
              Download & Start
            </span>
          {/if}
        </Button>

        {#if isLoadingModel && engineState.progress}
          <div class="mt-4 space-y-2">
            <div class="flex justify-between text-xs text-gray-500 dark:text-slate-400">
              <span>{engineState.progress.phase}</span>
              <span>{Math.round(engineState.progress.progress * 100)}%</span>
            </div>
            <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                style="width: {engineState.progress.progress * 100}%"
              ></div>
            </div>
            {#if engineState.progress.message}
              <p class="text-xs text-gray-500 dark:text-slate-400 truncate">
                {engineState.progress.message}
              </p>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- Tips -->
    <div class="text-center text-sm text-gray-500 dark:text-slate-500 space-y-1">
      <p>💡 <strong>First time?</strong> Recommended models work best for local inference.</p>
      <p>📦 Cached models load instantly without downloading.</p>
    </div>
  </div>
</div>
