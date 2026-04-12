<script lang="ts">
  /**
   * ModelSelector component.
   * Grouped model dropdown with detail panel and cached indicator.
   */

  import {
    getModelsByFamily,
    getRecommendedModels,
    getModelInfo,
    MODEL_FAMILIES,
    DEFAULT_MODEL_ID,
    type ModelInfo,
  } from '../config';

  interface Props {
    cachedModelIds: Set<string>;
    selectedModelId: string;
    onModelSelect: (modelId: string) => void;
  }

  let { cachedModelIds, selectedModelId = $bindable(DEFAULT_MODEL_ID), onModelSelect }: Props = $props();

  const recommendedModels = getRecommendedModels();
  const familyMap = getModelsByFamily();

  const selectedInfo: ModelInfo | undefined = $derived(getModelInfo(selectedModelId));
  const isCached: boolean = $derived(cachedModelIds.has(selectedModelId));

  function getFamilyLabel(familyId: string): string {
    return MODEL_FAMILIES.find(f => f.id === familyId)?.name ?? familyId;
  }

  function formatContextWindow(tokens: number): string {
    const k = Math.round(tokens / 1024);
    return `${k}K ctx`;
  }

  function formatOptionLabel(info: ModelInfo): string {
    const size = info.sizeGB > 0 ? ` (~${info.sizeGB} GB)` : '';
    const ctx = info.contextWindowSize > 0 ? `, ${formatContextWindow(info.contextWindowSize)}` : '';
    const runtimeLabel = info.runtime === 'transformers.js' ? ' [TJS]' : '';
    return `${info.displayName}${size}${ctx}${runtimeLabel}`;
  }

  function handleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      selectedModelId = select.value;
      onModelSelect(select.value);
    }
  }

  // Derive display values from selectedInfo
  const familyDesc = $derived(
    selectedInfo ? (MODEL_FAMILIES.find(f => f.id === selectedInfo.family)?.description ?? '') : ''
  );
  const sizeStr = $derived(
    selectedInfo
      ? selectedInfo.sizeGB > 0
        ? `~${selectedInfo.sizeGB} GB`
        : selectedInfo.vramMB > 0
          ? `${selectedInfo.vramMB} MB`
          : 'Unknown'
      : ''
  );
  const vramStr = $derived(
    selectedInfo && selectedInfo.vramMB > 0
      ? `~${Math.round(selectedInfo.vramMB / 1024 * 10) / 10} GB`
      : 'Unknown'
  );
  const ctxStr = $derived(
    selectedInfo && selectedInfo.contextWindowSize > 0
      ? formatContextWindow(selectedInfo.contextWindowSize)
      : 'Unknown'
  );
  const runtimeStr = $derived(
    selectedInfo?.runtime === 'transformers.js'
      ? '🟢 Transformers.js (ONNX/WebGPU)'
      : 'WebLLM (WebGPU)'
  );
</script>

<div id="model-selector-container" class="flex flex-col gap-2">
  <label for="model-select" class="font-semibold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wider">
    Choose a model
  </label>

  <select
    id="model-select"
    class="w-full px-3 py-2 text-base text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer appearance-auto transition-[border-color] duration-150 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-400"
    aria-label="Select AI model"
    value={selectedModelId}
    onchange={handleChange}
  >
    <option value="" disabled>— Select a model —</option>

    <!-- Recommended group -->
    <optgroup label="⭐ Recommended">
      {#each recommendedModels as info (info.modelId)}
        <option value={info.modelId}>{formatOptionLabel(info)}</option>
      {/each}
    </optgroup>

    <!-- Family groups -->
    {#each [...familyMap.entries()] as [familyId, models] (familyId)}
      {#if models.length > 0}
        <optgroup label={getFamilyLabel(familyId)}>
          {#each models as info (info.modelId)}
            <option value={info.modelId}>{formatOptionLabel(info)}</option>
          {/each}
        </optgroup>
      {/if}
    {/each}
  </select>

  <!-- Detail panel -->
  <div
    class="min-h-[80px] p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
    aria-live="polite"
  >
    {#if !selectedInfo}
      <p class="text-gray-500 dark:text-slate-400 text-center m-0 py-2">Select a model to see details.</p>
    {:else}
      <div class="flex flex-col gap-1">
        <div class="flex justify-between items-center gap-2">
          <span class="text-gray-500 dark:text-slate-400 flex-shrink-0">Download size</span>
          <span class="text-gray-900 dark:text-slate-100 font-medium text-right">{sizeStr}</span>
        </div>
        <div class="flex justify-between items-center gap-2">
          <span class="text-gray-500 dark:text-slate-400 flex-shrink-0">VRAM needed</span>
          <span class="text-gray-900 dark:text-slate-100 font-medium text-right">{vramStr}</span>
        </div>
        <div class="flex justify-between items-center gap-2">
          <span class="text-gray-500 dark:text-slate-400 flex-shrink-0">Context window</span>
          <span class="text-gray-900 dark:text-slate-100 font-medium text-right">{ctxStr}</span>
        </div>
        <div class="flex justify-between items-center gap-2">
          <span class="text-gray-500 dark:text-slate-400 flex-shrink-0">Runtime</span>
          <span class="text-gray-900 dark:text-slate-100 font-medium text-right">{runtimeStr}</span>
        </div>
        {#if selectedInfo.tags && selectedInfo.tags.length > 0}
          <div class="flex justify-between items-center gap-2">
            <span class="text-gray-500 dark:text-slate-400 flex-shrink-0">Tags</span>
            <span class="text-gray-900 dark:text-slate-100 font-medium text-right flex items-center gap-1 flex-wrap justify-end">
              {#each selectedInfo.tags as tag (tag)}
                <span class="inline-block px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[11px] font-semibold">{tag}</span>
              {/each}
            </span>
          </div>
        {/if}
        {#if familyDesc}
          <div class="flex justify-between items-center gap-2">
            <span class="text-gray-500 dark:text-slate-400 flex-shrink-0">Family</span>
            <span class="italic font-normal text-gray-500 dark:text-slate-400 text-right">{familyDesc}</span>
          </div>
        {/if}
        {#if isCached}
          <div class="mt-1">
            <span class="inline-block px-2.5 py-[3px] bg-green-500 text-white rounded-full text-[11px] font-semibold">✓ Cached locally</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
