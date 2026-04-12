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
  import * as Select from '$ui/select';
  import { Badge } from '$ui/badge';

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

  // Label shown in the trigger
  const selectedLabel = $derived(
    selectedInfo ? formatOptionLabel(selectedInfo) : '— Select a model —'
  );
</script>

<div id="model-selector-container" class="flex flex-col gap-2">
  <label for="model-select" class="font-semibold text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wider">
    Choose a model
  </label>

  <Select.Root
    type="single"
    value={selectedModelId}
    onValueChange={(value: string) => {
      if (value) {
        selectedModelId = value;
        onModelSelect(value);
      }
    }}
  >
    <Select.Trigger id="model-select" class="w-full" aria-label="Select AI model">
      <span data-slot="select-value" class="truncate">{selectedLabel}</span>
    </Select.Trigger>
    <Select.Content>
      <!-- Recommended group -->
      <Select.Group>
        <Select.GroupHeading>⭐ Recommended</Select.GroupHeading>
        {#each recommendedModels as info (info.modelId)}
          <Select.Item value={info.modelId} label={formatOptionLabel(info)}>
            {formatOptionLabel(info)}
          </Select.Item>
        {/each}
      </Select.Group>

      <!-- Family groups -->
      {#each [...familyMap.entries()] as [familyId, models] (familyId)}
        {#if models.length > 0}
          <Select.Separator />
          <Select.Group>
            <Select.GroupHeading>{getFamilyLabel(familyId)}</Select.GroupHeading>
            {#each models as info (info.modelId)}
              <Select.Item value={info.modelId} label={formatOptionLabel(info)}>
                {formatOptionLabel(info)}
              </Select.Item>
            {/each}
          </Select.Group>
        {/if}
      {/each}
    </Select.Content>
  </Select.Root>

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
                <Badge variant="default" class="text-[11px] px-2 py-0.5">{tag}</Badge>
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
            <Badge variant="secondary" class="text-[11px]">✓ Cached locally</Badge>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
