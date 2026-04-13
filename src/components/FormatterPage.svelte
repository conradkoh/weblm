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
  import ChunkList from './ChunkList.svelte';
  import ChunkDetail from './ChunkDetail.svelte';
  import StreamingChunkCard from './StreamingChunkCard.svelte';
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
    setUseWorkerPool,
    setWorkerPoolSize,
    setWorkerModelId,
    stopProcessing,
    setPreviewMode,
    nextChunk,
    prevChunk,
    selectChunkForInspection,
  } from '../stores/formatterStore.svelte';
  import { getChunkCount } from '../lib/formatter/chunker';
  import { renderMarkdown } from '../lib/markdown';
  import { TEST_SOURCE_CONTENT, TEST_DESIRED_FORMAT } from '../lib/formatter/testData';
  import type { ExtractionResult } from '../stores/types';

  const formatterState = getFormatterState();
  const engineState = getEngineState();

  // Derived: estimated chunk count from source content
  const estimatedChunkCount = $derived(
    formatterState.sourceContent.trim()
      ? getChunkCount(formatterState.sourceContent, { chunkSize: 800 })
      : 0
  );

  // Load model button state
  let isLoadingModel = $state(false);

  // Derived: check if the selected model is already loaded
  const modelLoaded = $derived(
    formatterState.selectedModelId !== null && 
    engineState.currentModelId === formatterState.selectedModelId
  );

  // Load persisted data on mount
  $effect(() => {
    loadFromLocalStorage();
  });

  // Live elapsed timer during processing
  let elapsedSeconds = $state(0);
  $effect(() => {
    if (formatterState.isProcessing && formatterState.runStartedAt) {
      // Update every second
      const interval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - formatterState.runStartedAt!) / 1000);
      }, 1000);
      
      // Initial update
      elapsedSeconds = Math.floor((Date.now() - formatterState.runStartedAt!) / 1000);
      
      // Cleanup on stop
      return () => clearInterval(interval);
    } else {
      elapsedSeconds = 0;
    }
  });
  
  // Format duration helper
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

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

  function handleLoadTestData(): void {
    setSourceContent(TEST_SOURCE_CONTENT);
    setDesiredFormat(TEST_DESIRED_FORMAT);
  }

  async function handleLoadModel(): Promise<void> {
    if (!formatterState.selectedModelId) return;
    isLoadingModel = true;
    try {
      await loadModel(formatterState.selectedModelId, { skipScreenTransition: true });
    } catch (e) {
      alert('Failed to load model. Please try again.');
    } finally {
      isLoadingModel = false;
    }
  }

  async function handleRefineSource(force: boolean = false): Promise<void> {
    if (!formatterState.selectedModelId || engineState.currentModelId !== formatterState.selectedModelId) {
      alert('Please load a model first by clicking the ▶ Load button.');
      return;
    }
    
    await runRefinement({ force });
  }

  function handleStop(): void {
    stopProcessing();
  }

  async function handleRunExtraction(): Promise<void> {
    if (!formatterState.selectedModelId || engineState.currentModelId !== formatterState.selectedModelId) {
      alert('Please load a model first by clicking the ▶ Load button.');
      return;
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

  let workerPoolExpanded = $state(false);

  function handleWorkerPoolToggle(e: Event): void {
    const target = e.target as HTMLInputElement;
    setUseWorkerPool(target.checked);
  }

  function handleWorkerPoolSizeChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    setWorkerPoolSize(parseInt(target.value, 10));
  }

  function handleWorkerModelIdChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    setWorkerModelId(target.value);
  }

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

  // Check if refinement has started (we have pipeline data)
  const hasPipelineData = $derived(
    formatterState.pipelineData.chunks.length > 0
  );

  // Check if processing has started (chunks exist OR we have results)
  const processingStarted = $derived(
    hasPipelineData || formatterState.refinedChunks.length > 0
  );

  // Show progressive output during refinement (not idle, complete, or error)
  const showProgressiveOutput = $derived(
    formatterState.refinementState === 'chunking' ||
    formatterState.refinementState === 'formatting' ||
    formatterState.refinementState === 'analyzing' ||
    formatterState.refinementState === 'refining'
  );

  // Get status for a chunk at a given index
  function getChunkStatus(index: number, totalChunks: number): 'pending' | 'streaming' | 'complete' {
    const pipelineChunk = formatterState.pipelineData.chunks[index];
    if (!pipelineChunk) return 'pending';
    
    // If chunk is completed in partial results, it's complete
    if (index < formatterState.partialRefinedChunks.length) {
      return 'complete';
    }
    
    // If this is the currently streaming chunk, show streaming state
    if (formatterState.activeStreamingChunkIndex === index) {
      return 'streaming';
    }
    
    // If this is the next chunk to process and we're still processing, it might be pending
    if (index === formatterState.partialRefinedChunks.length && showProgressiveOutput) {
      return 'pending'; // Will become streaming when it's its turn
    }
    
    return 'pending';
  }

  // Handler for chunk selection
  function handleSelectChunk(index: number): void {
    selectChunkForInspection(index);
  }

  // Handler for navigation in detail panel
  function handleDetailNavigate(direction: 'prev' | 'next'): void {
    const current = formatterState.pipelineData.selectedChunkIndex;
    if (current === null) return;
    
    if (direction === 'prev' && current > 0) {
      selectChunkForInspection(current - 1);
    } else if (direction === 'next' && current < formatterState.pipelineData.chunks.length - 1) {
      selectChunkForInspection(current + 1);
    }
  }

  // Handler to close detail panel
  function handleCloseDetail(): void {
    selectChunkForInspection(null);
  }

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

  // Get backend type indicator for display
  const backendTypeLabel = $derived(
    formatterState.useWorkerPool && formatterState.workerModelId
      ? `Worker Pool (${formatterState.workerPoolSize} workers)`
      : `Local Engine (concurrency: 1)`
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
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <ModelSelector
            cachedModelIds={engineState.cachedModelIds}
            selectedModelId={formatterState.selectedModelId ?? ''}
            onModelSelect={handleModelSelect}
          />
        </div>
        <Button
          size="sm"
          variant={modelLoaded ? "outline" : "default"}
          onclick={handleLoadModel}
          disabled={!formatterState.selectedModelId || isLoadingModel}
        >
          {#if isLoadingModel}
            ⏳
          {:else if modelLoaded}
            ✓ Loaded
          {:else}
            ▶ Load
          {/if}
        </Button>
      </div>
    </div>
  </div>
  <Separator />

  <!-- Worker Pool Settings (Collapsible, Experimental) -->
  <div class="px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
    <button
      type="button"
      class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 w-full"
      onclick={() => workerPoolExpanded = !workerPoolExpanded}
    >
      <span>{workerPoolExpanded ? '▼' : '▶'}</span>
      <span>⚡ Worker Pool (Experimental)</span>
      {#if formatterState.useWorkerPool && formatterState.workerModelId}
        <span class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
          {formatterState.workerPoolSize} workers
        </span>
      {:else if formatterState.useWorkerPool}
        <span class="text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
          ⚠ Select model
        </span>
      {/if}
    </button>
    {#if workerPoolExpanded}
      <div class="mt-2 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
        <label class="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={formatterState.useWorkerPool}
            onchange={handleWorkerPoolToggle}
            class="rounded border-gray-300 dark:border-slate-600"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Use Worker Pool</span>
          {#if formatterState.useWorkerPool}
            <span class="text-xs text-gray-500 dark:text-slate-500">({backendTypeLabel})</span>
          {/if}
        </label>
        {#if formatterState.useWorkerPool}
          <div class="space-y-3">
            <div>
              <label for="worker-model" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Worker Model (Transformers.js compatible)
              </label>
              <input
                id="worker-model"
                type="text"
                value={formatterState.workerModelId}
                oninput={handleWorkerModelIdChange}
                placeholder="Xenova/phi-2"
                class="w-full px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
              <p class="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Must be a model compatible with Transformers.js (e.g., Xenova/phi-2)
              </p>
            </div>
            <div>
              <label for="worker-size" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Number of Workers (1-4)
              </label>
              <input
                id="worker-size"
                type="range"
                min="1"
                max="4"
                value={formatterState.workerPoolSize}
                oninput={handleWorkerPoolSizeChange}
                class="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-slate-600"
              />
              <div class="flex justify-between text-xs text-gray-500 dark:text-slate-500 mt-1">
                <span>1</span>
                <span>Current: {formatterState.workerPoolSize}</span>
                <span>4</span>
              </div>
              <p class="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ Each worker loads its own model copy. Memory usage = workers × model size.
              </p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <Separator />

  <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 min-h-0 max-h-[calc(100vh-180px)] overflow-hidden">
    <!-- Source Column -->
    <div class="flex flex-col gap-2 min-h-0">
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <label for="source-input" class="font-semibold text-sm text-gray-700 dark:text-slate-300">
            Source
          </label>
          {#if estimatedChunkCount > 0}
            <span class="text-xs text-gray-500 dark:text-slate-500">
              ~{estimatedChunkCount} chunks
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            title="Load test data for demo"
            onclick={handleLoadTestData}
          >
            📋 Test Data
          </Button>
          {#if formatterState.refinedChunks.length > 0 && formatterState.refinementState === 'complete'}
            <Button
              variant="outline"
              size="sm"
              title="Re-process source with current content"
              onclick={() => handleRefineSource(true)}
            >
              🔄 Re-process
            </Button>
          {/if}
          <Button
            variant="default"
            size="sm"
            disabled={!formatterState.sourceContent.trim() || isRefining || isExtracting}
            onclick={() => handleRefineSource(false)}
          >
            {isRefining ? 'Refining...' : 'Refine Source'}
          </Button>
          {#if formatterState.isProcessing}
            <Button
              variant="destructive"
              size="sm"
              title="Stop processing"
              onclick={handleStop}
            >
              ⏹ Stop
            </Button>
          {/if}
        </div>
      </div>
      <!-- Source column content: textarea or ChunkList -->
      {#if processingStarted}
        <ChunkList
          chunks={formatterState.pipelineData.chunks}
          selectedIndex={formatterState.pipelineData.selectedChunkIndex}
          onSelectChunk={handleSelectChunk}
          activeProcessingIndex={formatterState.activeProcessingChunkIndex}
        />
      {:else}
        <Textarea
          id="source-input"
          placeholder="Paste your source content here..."
          class="flex-1 min-h-[200px] max-h-[300px] resize-none overflow-y-auto"
          value={formatterState.sourceContent}
          oninput={handleSourceChange}
          disabled={isRefining || isExtracting}
        />
      {/if}
    </div>

    <!-- Chunk Detail Panel (slide-in when chunk selected) -->
    {#if formatterState.pipelineData.selectedChunkIndex !== null && formatterState.pipelineData.chunks.length > 0}
      {@const selectedChunk = formatterState.pipelineData.chunks[formatterState.pipelineData.selectedChunkIndex]!}
        <ChunkDetail
          chunk={selectedChunk}
          totalChunks={formatterState.pipelineData.chunks.length}
          onNavigate={handleDetailNavigate}
          onClose={handleCloseDetail}
        />
    {/if}

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
        class="flex-1 min-h-[200px] max-h-[300px] resize-none overflow-y-auto"
        value={formatterState.desiredFormat}
        oninput={handleFormatChange}
        disabled={isRefining || isExtracting}
      />
    </div>

    <!-- Output Column -->
    <div class="flex flex-col gap-2 min-h-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <label for="output-display" class="font-semibold text-sm text-gray-700 dark:text-slate-300">
            Output
          </label>
          {#if formatterState.refinedChunks.length > 0 || formatterState.extractionResults.length > 0}
            <!-- Preview mode tabs -->
            <div class="flex items-center gap-1 ml-4">
              <button
                class="text-xs px-2 py-1 rounded {formatterState.previewMode === 'raw' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}"
                onclick={() => setPreviewMode('raw')}
              >
                Raw
              </button>
              <button
                class="text-xs px-2 py-1 rounded {formatterState.previewMode === 'preview' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}"
                onclick={() => setPreviewMode('preview')}
              >
                Preview
              </button>
              <button
                class="text-xs px-2 py-1 rounded {formatterState.previewMode === 'chunks' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}"
                onclick={() => setPreviewMode('chunks')}
              >
                Chunks
              </button>
            </div>
          {/if}
        </div>
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
      
      <!-- Output content based on preview mode -->
      <div id="output-display" class="flex-1 min-h-[200px] max-h-[300px] rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 overflow-y-auto">
        
        {#if formatterState.previewMode === 'preview' && formatterState.refinedChunks.length > 0}
          <!-- Preview mode: rendered markdown of all chunks -->
          <div class="p-3 prose prose-sm dark:prose-invert max-w-none">
            {@html renderMarkdown(formatterState.refinedChunks.join('\n\n---\n\n'))}
          </div>
        
        {:else if formatterState.previewMode === 'chunks' && formatterState.refinedChunks.length > 0}
          <!-- Chunks mode: individual chunk navigation -->
          {@const currentChunk = formatterState.refinedChunks[formatterState.currentChunkIndex]}
          <div class="p-3">
            <!-- Chunk navigation header -->
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Chunk {formatterState.currentChunkIndex + 1} of {formatterState.refinedChunks.length}
                </span>
                {#if currentChunk}
                  <span class="text-xs text-gray-500 dark:text-slate-400">
                    ({currentChunk.length} chars)
                  </span>
                {/if}
              </div>
              <div class="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={formatterState.currentChunkIndex === 0}
                  onclick={prevChunk}
                >
                  ◀ Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={formatterState.currentChunkIndex >= formatterState.refinedChunks.length - 1}
                  onclick={nextChunk}
                >
                  Next ▶
                </Button>
              </div>
            </div>
            <!-- Rendered chunk content -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
              {#if currentChunk}
                {@html renderMarkdown(currentChunk)}
              {:else}
                <p class="text-gray-400 dark:text-slate-500">No chunk selected</p>
              {/if}
            </div>
          </div>
        
        {:else if formatterState.refinementState === 'error'}
          <div class="flex items-center justify-center h-full text-red-500 dark:text-red-400 text-sm p-4">
            Error: {formatterState.errorMessage ?? 'Unknown error'}
          </div>
        {:else if formatterState.extractionState === 'error'}
          <div class="flex items-center justify-center h-full text-red-500 dark:text-red-400 text-sm p-4">
            Extraction Error: {formatterState.errorMessage ?? 'Unknown error'}
          </div>
        {:else if showProgressiveOutput && formatterState.pipelineData.chunks.length > 0}
          <!-- Progressive output: show chunks as they complete -->
          <div class="p-3 space-y-3">
            {#each formatterState.pipelineData.chunks as chunk, index (index)}
              {@const status = getChunkStatus(index, formatterState.pipelineData.chunks.length)}
              {@const content = formatterState.partialRefinedChunks[index] ?? null}
              <StreamingChunkCard
                {content}
                {index}
                {status}
                streamingText={status === 'streaming' ? formatterState.streamingText : ''}
              />
            {/each}
          </div>
        {:else if formatterState.extractionResults.length === 0}
          {#if formatterState.refinedChunks.length === 0}
            <div class="flex items-center justify-center h-full text-gray-400 dark:text-slate-500 text-sm p-4">
              1. Add source content<br/>2. Click "Refine Source"<br/>3. Add format criteria<br/>4. Click "Run Extraction"
            </div>
          {:else}
            <!-- Raw mode: show chunks as plain text -->
            <div class="p-3 font-mono text-xs whitespace-pre-wrap text-gray-700 dark:text-slate-300">
              {formatterState.refinedChunks.join('\n\n---\n\n')}
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
  {#if formatterState.isProcessing && formatterState.taskPlan.status === 'running'}
    {@const plan = formatterState.taskPlan}
    {@const currentPhase = plan.phases[plan.currentPhaseIndex]}
    {@const totalPhases = plan.phases.length}
    {@const phaseNum = plan.currentPhaseIndex + 1}
    <div class="px-4 py-3 bg-gray-100 dark:bg-slate-800/80 flex-shrink-0">
      <!-- Phase indicator -->
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-medium text-gray-700 dark:text-slate-300">
          Phase {phaseNum} of {totalPhases}: {currentPhase?.name ?? 'Processing'}
        </span>
        <span class="text-xs text-gray-500 dark:text-slate-500">
          Running... {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
        </span>
      </div>
      <!-- Progress bar -->
      <div class="w-full h-2 rounded-full bg-gray-300 dark:bg-slate-600 overflow-hidden">
        <div 
          class="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300"
          style="width: {currentPhase && currentPhase.totalSteps > 0 ? Math.round((currentPhase.completedSteps / currentPhase.totalSteps) * 100) : 0}%"
        ></div>
      </div>
      <!-- Overall progress dots -->
      <div class="flex items-center gap-1 mt-2">
        {#each plan.phases as phase, i}
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full {i < plan.currentPhaseIndex ? 'bg-green-500' : i === plan.currentPhaseIndex ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'}"></div>
            <span class="text-xs {i === plan.currentPhaseIndex ? 'text-gray-700 dark:text-slate-300' : 'text-gray-400 dark:text-slate-500'}">{phase.name}</span>
            {#if phase.durationMs}
              <span class="text-xs text-gray-400 dark:text-slate-600">{formatDuration(phase.durationMs)}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else if formatterState.isProcessing}
    <!-- Fallback for processing without plan (e.g., during chunking before plan is created) -->
    <div class="px-4 py-3 bg-gray-100 dark:bg-slate-800/80 flex-shrink-0">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-600 dark:text-slate-400">
          {formatterState.currentPhase ?? 'Processing...'}
          {#if formatterState.partialRefinedChunks.length > 0}
            — {formatterState.partialRefinedChunks.length} chunks done
          {/if}
        </span>
        <span class="text-xs text-gray-500 dark:text-slate-500">
          Running... {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  {:else if formatterState.extractionState === 'complete' && formatterState.extractionResults.length > 0}
    <div class="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-400 flex-shrink-0">
      ✓ Extraction complete — {relevantCount} of {formatterState.extractionResults.length} results relevant
      {#if formatterState.runCompletedAt && formatterState.runStartedAt}
        <span class="ml-2 text-xs opacity-70">({formatDuration(formatterState.runCompletedAt - formatterState.runStartedAt)})</span>
      {/if}
    </div>
  {:else if formatterState.refinementState === 'complete' && formatterState.refinedChunks.length > 0}
    <div class="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-400 flex-shrink-0">
      {#if formatterState.isStopped}
        ⏹ Stopped: {formatterState.partialRefinedChunks.length} of {formatterState.totalChunks} chunks completed
      {:else}
        ✓ {formatterState.currentPhase?.includes('cached') ? formatterState.currentPhase : `Refinement complete — ${formatterState.refinedChunks.length} chunks ready. Add format criteria and run extraction.`}
      {/if}
      {#if !formatterState.isStopped && formatterState.runCompletedAt && formatterState.runStartedAt && !formatterState.currentPhase?.includes('cached')}
        <span class="ml-2 text-xs opacity-70">({formatDuration(formatterState.runCompletedAt - formatterState.runStartedAt)})</span>
      {/if}
    </div>
  {:else if formatterState.isStopped}
    <div class="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-700 dark:text-yellow-400 flex-shrink-0">
      ⏹ Processing stopped — {formatterState.partialRefinedChunks.length} chunks available
    </div>
  {:else if formatterState.sourceContent.trim()}
    <div class="px-4 py-2 bg-gray-100 dark:bg-slate-800/80 text-sm text-gray-600 dark:text-slate-400 flex-shrink-0">
      💡 Click "Refine Source" to process your content
    </div>
  {/if}
</div>