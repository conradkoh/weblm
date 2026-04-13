<script lang="ts">
  /**
   * FormatterModelBar component.
   * Compact model bar shown after model is loaded.
   * Allows switching models when needed.
   */
  import { Button } from '$ui/button';
  import { getEngineState, loadModel } from '../stores/engineStore.svelte';
  import { getFormatterState, setSelectedModelId } from '../stores/formatterStore.svelte';

  interface Props {
    onModelSwitch?: () => void;
  }

  let { onModelSwitch }: Props = $props();

  const engineState = getEngineState();
  const formatterState = getFormatterState();

  let isLoadingModel = $state(false);

  function handleModelSelect(modelId: string): void {
    setSelectedModelId(modelId);
  }

  async function handleSwitchModel(): Promise<void> {
    if (!formatterState.selectedModelId) return;
    
    // If already loaded with this model, do nothing
    if (engineState.currentModelId === formatterState.selectedModelId) return;
    
    isLoadingModel = true;
    
    try {
      await loadModel(formatterState.selectedModelId, { skipScreenTransition: true });
      onModelSwitch?.();
    } finally {
      isLoadingModel = false;
    }
  }

  // Get current model display name
  const currentModelName = $derived(
    engineState.currentModelId 
      ? engineState.modelDisplayName ?? engineState.currentModelId
      : formatterState.selectedModelId ?? 'No model'
  );

  // Check if we need to load a different model
  const needsModelLoad = $derived(
    formatterState.selectedModelId !== null &&
    formatterState.selectedModelId !== engineState.currentModelId
  );
</script>

<div class="px-4 py-1.5 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2 text-sm">
  <!-- Left: Model info -->
  <div class="flex items-center gap-2">
    <span class="text-gray-500 dark:text-slate-400">Model:</span>
    <span class="font-medium text-gray-700 dark:text-slate-300 truncate max-w-[200px]">
      {currentModelName}
    </span>
    {#if engineState.currentModelId === formatterState.selectedModelId}
      <span class="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
        ✓
      </span>
    {/if}
  </div>

  <!-- Right: Switch button -->
  <div class="flex items-center gap-2">
    <!-- Model dropdown (simplified) -->
    <select
      class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 max-w-[150px]"
      value={formatterState.selectedModelId ?? ''}
      onchange={(e) => handleModelSelect((e.target as HTMLSelectElement).value)}
    >
      <option value="" disabled>Select model...</option>
      {#each [...engineState.cachedModelIds] as modelId (modelId)}
        <option value={modelId}>{modelId}</option>
      {/each}
    </select>

    <Button
      variant="ghost"
      size="sm"
      title={needsModelLoad ? 'Switch to selected model' : 'Model already loaded'}
      disabled={!needsModelLoad || isLoadingModel}
      onclick={handleSwitchModel}
    >
      {#if isLoadingModel}
        <span class="animate-spin">⏳</span>
      {:else}
        🔄
      {/if}
    </Button>
  </div>
</div>
