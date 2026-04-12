<script lang="ts">
  /**
   * FormatterPage component.
   * 3-column layout: Source | Desired Format | Output
   * Handles content input, format instructions, and displays output results.
   * Includes source refinement (Phase 2) and extraction (Phase 3).
   */

  import { Button } from '$ui/button';
  import { Separator } from '$ui/separator';
  import { Textarea } from '$ui/textarea';
  import ModelSelector from './ModelSelector.svelte';
  import { setScreen } from '../stores/appStore.svelte';
  import { getEngineState, loadModel } from '../stores/engineStore.svelte';
  import {
    getFormatterState,
    setSourceContent,
    setDesiredFormat,
    setSelectedModelId,
    clearOutputResults,
    loadFromLocalStorage,
    resetFormatterState,
    runRefinement,
    resetRefinement,
    runExtraction,
    resetExtraction,
    toggleShowAllResults,
    setCloudApiUrl,
    setCloudApiKey,
    setCloudApiModel,
    setUseCloudApi,
  } from '../stores/formatterStore.svelte';
  import type { ExtractionResult } from '../stores/types';

  const formatterState = getFormatterState();
  const engineState = getEngineState();

  // Load persisted data on mount
  $effect(() => {
    loadFromLocalStorage();
  });

  function handleSourceChange(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    setSourceContent(target.value);
  }

  function handleFormatChange(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    setDesiredFormat(target.value);
  }

  function handleClearOutput(): void {
    clearOutputResults();
    resetExtraction();
  }

  function handleReset(): void {
    resetFormatterState();
    resetRefinement();
    resetExtraction();
  }

  function handleGoHome(): void {
    setScreen('launcher-home');
  }

  async function handleRefineSource(): Promise<void> {
    if (!formatterState.selectedModelId) {
      alert('Please select a model first to process the content.');
      return;
    }
    
    // Load model if different from currently loaded
    if (engineState.currentModelId !== formatterState.selectedModelId) {
      const success = await loadModel(formatterState.selectedModelId, { skipScreenTransition: true });
      if (!success) {
        alert('Failed to load the selected model. Please try again.');
        return;
      }
    }
    
    await runRefinement();
  }

  async function handleRunExtraction(): Promise<void> {
    if (!formatterState.selectedModelId) {
      alert('Please select a model first to extract content.');
      return;
    }
    
    // Load model if different from currently loaded
    if (engineState.currentModelId !== formatterState.selectedModelId) {
      const success = await loadModel(formatterState.selectedModelId, { skipScreenTransition: true });
      if (!success) {
        alert('Failed to load the selected model. Please try again.');
        return;
      }
    }
    
    await runExtraction();
  }

  function handleModelSelect(modelId: string): void {
    setSelectedModelId(modelId);
  }

  function handleResetRefinement(): void {
    resetRefinement();
  }

  function handleResetExtraction(): void {
    resetExtraction();
  }

  function handleToggleShowAll(): void {
    toggleShowAllResults();
  }

  function handleCloudApiToggle(e: Event): void {
    const target = e.target as HTMLInputElement;
    setUseCloudApi(target.checked);
  }

  function handleCloudApiUrlChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    setCloudApiUrl(target.value);
  }

  function handleCloudApiKeyChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    setCloudApiKey(target.value);
  }

  function handleCloudApiModelChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    setCloudApiModel(target.value);
  }

  let cloudSettingsExpanded = $state(false);

  function handleCopyToClipboard(result: ExtractionResult): void {
    const text = result.title ? `## ${result.title}\n\n${result.content}` : result.content;
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  }

  function handleCopyAllRelevant(): void {
    const relevantResults = formatterState.extractionResults.filter(
      r => r.relevance !== 'none' && r.content !== '<NOT RELEVANT>'
    );
    const text = relevantResults.map(r => 
      r.title ? `## ${r.title}\n\n${r.content}` : r.content
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  }

  function handleDownloadMarkdown(): void {
    const relevantResults = formatterState.extractionResults.filter(
      r => r.relevance !== 'none' && r.content !== '<NOT RELEVANT>'
    );
    
    const lines: string[] = ['# Extraction Results\n'];
    lines.push(`_Generated: ${new Date().toLocaleString()}_\n`);
    lines.push(`_Relevance filter: ${formatterState.showAllResults ? 'Show all' : 'Show relevant only'}_\n\n`);
    
    for (const result of relevantResults) {
      if (result.title) {
        lines.push(`## ${result.title}`);
      }
      lines.push(`_Relevance: ${result.relevance} | ${result.reasoning}_\n`);
      lines.push(result.content);
      lines.push('\n---\n');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Map refinement state to progress value
  function getRefinementProgress(): number {
    switch (formatterState.refinementState) {
      case 'idle': return 0;
      case 'chunking': return 20;
      case 'formatting': return 40;
      case 'analyzing': return 60;
      case 'refining': return 80;
      case 'complete': return 100;
      case 'error': return 0;
      default: return 0;
    }
  }

  // Check if refinement is in progress
  const isRefining = $derived(
    formatterState.refinementState !== 'idle' &&
    formatterState.refinementState !== 'complete' &&
    formatterState.refinementState !== 'error'
  );

  // Check if extraction is in progress
  const isExtracting = $derived(
    formatterState.extractionState !== 'idle' &&
    formatterState.extractionState !== 'complete' &&
    formatterState.extractionState !== 'error'
  );

  // Computed values for stats
  const relevantCount = $derived(
    formatterState.extractionResults.filter(
      r => r.relevance !== 'none' && r.content !== '<NOT RELEVANT>'
    ).length
  );

  // Get displayed results based on filter
  const displayedResults = $derived(
    formatterState.showAllResults 
      ? formatterState.extractionResults 
      : formatterState.extractionResults.filter(
          r => r.relevance !== 'none' && r.content !== '<NOT RELEVANT>'
        )
  );

  // Check if cloud API is properly configured
  const cloudApiConfigured = $derived(
    formatterState.useCloudApi && 
    formatterState.cloudApiKey.trim() !== '' && 
    formatterState.cloudApiUrl.trim() !== ''
  );

  // Get backend type indicator for display
  const backendTypeLabel = $derived(
    cloudApiConfigured ? `Cloud API (concurrency: 5)` : `Local Engine (concurrency: 1)`
  );

  // Get relevance badge class
  function getRelevanceBadgeClass(relevance: string): string {
    switch (relevance) {
      case 'high': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400';
      case 'low': return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      case 'none': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  }
</script>

<div class="flex flex-col h-full w-full">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-slate-800 flex-shrink-0">
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        title="Go to apps"
        aria-label="Go back to app launcher"
        onclick={handleGoHome}
      >
        🏠
      </Button>
      <span class="font-semibold text-gray-900 dark:text-slate-100 text-sm">Formatter</span>
    </div>
    <div class="flex items-center gap-2">
      {#if formatterState.refinedChunks.length > 0}
        <span class="text-xs text-gray-500 dark:text-slate-400">
          {formatterState.refinedChunks.length} chunks refined
        </span>
      {/if}
      {#if formatterState.extractionResults.length > 0}
        <span class="text-xs text-gray-500 dark:text-slate-400">
          {relevantCount} relevant
        </span>
      {/if}
      <Button
        variant="ghost"
        size="sm"
        title="Reset everything"
        onclick={handleReset}
      >
        Reset
      </Button>
    </div>
  </div>
  <Separator />

  <!-- Model Selector Row -->
  <div class="px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
    <div class="max-w-2xl mx-auto">
      <ModelSelector
        cachedModelIds={engineState.cachedModelIds}
        selectedModelId={formatterState.selectedModelId ?? ''}
        onModelSelect={handleModelSelect}
      />
    </div>
  </div>
  <Separator />

  <!-- Cloud API Settings (Collapsible) -->
  <div class="px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
    <button
      type="button"
      class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 w-full"
      onclick={() => cloudSettingsExpanded = !cloudSettingsExpanded}
    >
      <span>{cloudSettingsExpanded ? '▼' : '▶'}</span>
      <span>⚙️ Cloud API Settings</span>
      {#if cloudApiConfigured}
        <span class="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
          ✓ Configured
        </span>
      {:else if formatterState.useCloudApi}
        <span class="text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
          ⚠ Incomplete
        </span>
      {/if}
    </button>
    {#if cloudSettingsExpanded}
      <div class="mt-2 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
        <label class="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={formatterState.useCloudApi}
            onchange={handleCloudApiToggle}
            class="rounded border-gray-300 dark:border-slate-600"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Use Cloud API</span>
          {#if formatterState.useCloudApi}
            <span class="text-xs text-gray-500 dark:text-slate-500">({backendTypeLabel})</span>
          {/if}
        </label>
        {#if formatterState.useCloudApi}
          <div class="space-y-3">
            <div>
              <label for="cloud-api-url" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                API URL
              </label>
              <input
                id="cloud-api-url"
                type="text"
                value={formatterState.cloudApiUrl}
                oninput={handleCloudApiUrlChange}
                placeholder="https://api.openai.com/v1"
                class="w-full px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label for="cloud-api-key" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                API Key
              </label>
              <input
                id="cloud-api-key"
                type="password"
                value={formatterState.cloudApiKey}
                oninput={handleCloudApiKeyChange}
                placeholder="sk-..."
                class="w-full px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
              <p class="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Note: API key is stored in localStorage (not production-secure)
              </p>
            </div>
            <div>
              <label for="cloud-api-model" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Model
              </label>
              <input
                id="cloud-api-model"
                type="text"
                value={formatterState.cloudApiModel}
                oninput={handleCloudApiModelChange}
                placeholder="gpt-4o-mini"
                class="w-full px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <Separator />

  <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 min-h-0 overflow-hidden">
    <!-- Source Column -->
    <div class="flex flex-col gap-2 min-h-0">
      <div class="flex items-center justify-between">
        <label for="source-input" class="font-semibold text-sm text-gray-700 dark:text-slate-300">
          Source
        </label>
        <Button
          variant="default"
          size="sm"
          disabled={!formatterState.sourceContent.trim() || isRefining || isExtracting}
          onclick={handleRefineSource}
        >
          {isRefining ? 'Refining...' : 'Refine Source'}
        </Button>
      </div>
      <Textarea
        id="source-input"
        placeholder="Paste your source content here..."
        class="flex-1 min-h-[200px] resize-none"
        value={formatterState.sourceContent}
        oninput={handleSourceChange}
        disabled={isRefining || isExtracting}
      />
    </div>

    <!-- Desired Format Column -->
    <div class="flex flex-col gap-2 min-h-0">
      <div class="flex items-center justify-between">
        <label for="format-input" class="font-semibold text-sm text-gray-700 dark:text-slate-300">
          Desired Format
        </label>
        {#if formatterState.refinedChunks.length > 0}
          <Button
            variant="default"
            size="sm"
            disabled={isExtracting || !formatterState.desiredFormat.trim()}
            onclick={handleRunExtraction}
          >
            {isExtracting ? 'Extracting...' : 'Run Extraction'}
          </Button>
        {/if}
      </div>
      <Textarea
        id="format-input"
        placeholder="Describe the format or extraction criteria..."
        class="flex-1 min-h-[200px] resize-none"
        value={formatterState.desiredFormat}
        oninput={handleFormatChange}
        disabled={isRefining || isExtracting}
      />
    </div>

    <!-- Output Column -->
    <div class="flex flex-col gap-2 min-h-0">
      <div class="flex items-center justify-between">
        <label for="output-display" class="font-semibold text-sm text-gray-700 dark:text-slate-300">
          Output
        </label>
        <div class="flex items-center gap-1">
          {#if formatterState.extractionResults.length > 0}
            <Button
              variant="ghost"
              size="sm"
              title="Copy all relevant"
              onclick={handleCopyAllRelevant}
            >
              📋 Copy All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Download as markdown"
              onclick={handleDownloadMarkdown}
            >
              ⬇️ Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={formatterState.showAllResults ? 'Hide not relevant' : 'Show all'}
              onclick={handleToggleShowAll}
            >
              {formatterState.showAllResults ? '🔍 Hide N/A' : '🔍 Show All'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Clear results"
              onclick={handleResetExtraction}
            >
              ✕
            </Button>
          {/if}
        </div>
      </div>
      <div id="output-display" class="flex-1 min-h-[200px] rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 overflow-auto">
        {#if formatterState.refinementState === 'error'}
          <div class="flex items-center justify-center h-full text-red-500 dark:text-red-400 text-sm p-4">
            Error: {formatterState.errorMessage ?? 'Unknown error'}
          </div>
        {:else if formatterState.extractionState === 'error'}
          <div class="flex items-center justify-center h-full text-red-500 dark:text-red-400 text-sm p-4">
            Extraction Error: {formatterState.errorMessage ?? 'Unknown error'}
          </div>
        {:else if formatterState.extractionResults.length === 0}
          {#if formatterState.refinedChunks.length === 0}
            <div class="flex items-center justify-center h-full text-gray-400 dark:text-slate-500 text-sm p-4">
              1. Add source content<br/>2. Click "Refine Source"<br/>3. Add format criteria<br/>4. Click "Run Extraction"
            </div>
          {:else}
            <div class="flex items-center justify-center h-full text-gray-400 dark:text-slate-500 text-sm p-4">
              Refined chunks ready. Add format criteria and click "Run Extraction".
            </div>
          {/if}
        {:else}
          <div class="p-3 space-y-3">
            {#each displayedResults as result (result.chunkId)}
              <details class="group">
                <summary class="cursor-pointer p-2 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium list-none">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="mr-1 text-xs opacity-50">▶</span>
                      {#if result.title}
                        <span class="font-medium">{result.title}</span>
                      {:else}
                        <span class="opacity-50">Chunk {result.chunkId + 1}</span>
                      {/if}
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs px-2 py-0.5 rounded {getRelevanceBadgeClass(result.relevance)}">
                        {result.relevance}
                      </span>
                      {#if result.content !== '<NOT RELEVANT>'}
                        <button 
                          class="text-xs opacity-50 hover:opacity-100"
                          onclick={(e) => { e.preventDefault(); handleCopyToClipboard(result); }}
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      {/if}
                    </div>
                  </div>
                </summary>
                <div class="mt-2 p-3 rounded bg-gray-100 dark:bg-slate-900 text-sm">
                  {#if result.content === '<NOT RELEVANT>'}
                    <div class="text-gray-400 dark:text-slate-500 italic">
                      Not relevant to desired format
                      {#if result.reasoning}
                        <div class="text-xs mt-1 opacity-70">Reason: {result.reasoning}</div>
                      {/if}
                    </div>
                  {:else}
                    <div class="whitespace-pre-wrap">{result.content}</div>
                    {#if result.reasoning}
                      <div class="text-xs mt-2 opacity-60 text-gray-500 dark:text-slate-400">
                        Reasoning: {result.reasoning}
                      </div>
                    {/if}
                  {/if}
                </div>
              </details>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Progress bar (shown while processing) -->
  {#if formatterState.isProcessing}
    <div class="px-4 py-3 bg-gray-100 dark:bg-slate-800/80 flex-shrink-0">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-gray-600 dark:text-slate-400">
          {formatterState.currentPhase ?? 'Processing...'}
        </span>
        <span class="text-xs text-gray-500 dark:text-slate-500">
          {formatterState.extractionState !== 'idle' ? formatterState.extractionState : formatterState.refinementState}
        </span>
      </div>
      <div class="w-full h-2 rounded-full bg-gray-300 dark:bg-slate-600 overflow-hidden">
        <div 
          class="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300"
          style="width: {formatterState.extractionState !== 'idle' ? 50 : getRefinementProgress()}%"
        ></div>
      </div>
    </div>
  {:else if formatterState.extractionState === 'complete' && formatterState.extractionResults.length > 0}
    <div class="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-400 flex-shrink-0">
      ✓ Extraction complete — {relevantCount} of {formatterState.extractionResults.length} results relevant
    </div>
  {:else if formatterState.refinementState === 'complete' && formatterState.refinedChunks.length > 0}
    <div class="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-400 flex-shrink-0">
      ✓ Refinement complete — {formatterState.refinedChunks.length} chunks ready. Add format criteria and run extraction.
    </div>
  {:else if formatterState.sourceContent.trim()}
    <div class="px-4 py-2 bg-gray-100 dark:bg-slate-800/80 text-sm text-gray-600 dark:text-slate-400 flex-shrink-0">
      💡 Click "Refine Source" to process your content
    </div>
  {/if}
</div>