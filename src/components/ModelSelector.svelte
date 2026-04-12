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

<div id="model-selector-container" class="launcher-selector">
  <label for="model-select" class="launcher-select-label">Choose a model</label>

  <select
    id="model-select"
    class="launcher-select"
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
  <div class="launcher-detail-panel" aria-live="polite">
    {#if !selectedInfo}
      <p class="launcher-detail-placeholder">Select a model to see details.</p>
    {:else}
      <div class="launcher-detail-content">
        <div class="launcher-detail-row">
          <span class="launcher-detail-label">Download size</span>
          <span class="launcher-detail-value">{sizeStr}</span>
        </div>
        <div class="launcher-detail-row">
          <span class="launcher-detail-label">VRAM needed</span>
          <span class="launcher-detail-value">{vramStr}</span>
        </div>
        <div class="launcher-detail-row">
          <span class="launcher-detail-label">Context window</span>
          <span class="launcher-detail-value">{ctxStr}</span>
        </div>
        <div class="launcher-detail-row">
          <span class="launcher-detail-label">Runtime</span>
          <span class="launcher-detail-value">{runtimeStr}</span>
        </div>
        {#if selectedInfo.tags && selectedInfo.tags.length > 0}
          <div class="launcher-detail-row">
            <span class="launcher-detail-label">Tags</span>
            <span class="launcher-detail-value">
              {#each selectedInfo.tags as tag (tag)}
                <span class="launcher-tag">{tag}</span>
              {/each}
            </span>
          </div>
        {/if}
        {#if familyDesc}
          <div class="launcher-detail-row">
            <span class="launcher-detail-label">Family</span>
            <span class="launcher-detail-value launcher-family-desc">{familyDesc}</span>
          </div>
        {/if}
        {#if isCached}
          <div class="launcher-cached-row">
            <span class="launcher-cached-badge">✓ Cached locally</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .launcher-selector {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .launcher-select-label {
    font-weight: 600;
    color: var(--color-text);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .launcher-select {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius);
    cursor: pointer;
    appearance: auto;
    transition: border-color 0.15s ease;
  }

  .launcher-select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .launcher-select:hover {
    border-color: var(--color-primary);
  }

  .launcher-detail-panel {
    min-height: 80px;
    padding: var(--spacing-md);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
  }

  .launcher-detail-placeholder {
    color: var(--color-text-secondary);
    text-align: center;
    margin: 0;
    padding: var(--spacing-sm) 0;
  }

  .launcher-detail-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .launcher-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .launcher-detail-label {
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .launcher-detail-value {
    color: var(--color-text);
    font-weight: 500;
    text-align: right;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .launcher-family-desc {
    font-style: italic;
    font-weight: 400;
    color: var(--color-text-secondary);
  }

  .launcher-tag {
    display: inline-block;
    padding: 2px 8px;
    background-color: var(--color-primary);
    color: white;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
  }

  .launcher-cached-row {
    margin-top: var(--spacing-xs);
  }

  .launcher-cached-badge {
    display: inline-block;
    padding: 3px 10px;
    background-color: var(--color-success);
    color: white;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
  }
</style>
