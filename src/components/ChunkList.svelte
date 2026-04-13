<script lang="ts">
  /**
   * ChunkList component for pipeline observability.
   * Displays chunks with their status through the refinement pipeline.
   * Replaces source textarea when processing has started.
   */

  import { getFormatterState, selectChunkForInspection } from '../stores/formatterStore.svelte';
  import type { ChunkPipelineData } from '../stores/types';
  import ChunkProgressIndicator from './ChunkProgressIndicator.svelte';

  interface Props {
    chunks: ChunkPipelineData[];
    selectedIndex: number | null;
    onSelectChunk: (index: number) => void;
    activeProcessingIndex?: number | null;
  }

  let { chunks, selectedIndex, onSelectChunk, activeProcessingIndex = null }: Props = $props();

  const formatterState = getFormatterState();
  
  // Track refs for auto-scrolling
  let scrollContainer: HTMLDivElement | null = $state(null);
  let chunkRefs: (HTMLButtonElement | null)[] = $state([]);

  // Auto-scroll to active processing chunk
  $effect(() => {
    if (activeProcessingIndex !== null && chunkRefs[activeProcessingIndex] && scrollContainer) {
      chunkRefs[activeProcessingIndex]!.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });

  // Truncate text for preview (first ~50 chars, preserve words)
  function truncateText(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    // Try to break at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.6) {
      return truncated.slice(0, lastSpace) + '…';
    }
    return truncated + '…';
  }

  function handleChunkClick(index: number): void {
    onSelectChunk(index);
    selectChunkForInspection(index);
  }

  function handleKeyDown(e: KeyboardEvent, index: number): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleChunkClick(index);
    }
  }
</script>

<div class="flex flex-col gap-1 overflow-y-auto max-h-[300px] min-h-[200px]" bind:this={scrollContainer}>
  {#each chunks as chunk, index (chunk.index)}
    {@const isSelected = selectedIndex === index}
    {@const isActiveProcessing = activeProcessingIndex === index}
    {@const isCompleted = chunk.status === 'formatted' || chunk.status === 'analyzed' || chunk.status === 'refined'}
    
    <button
      type="button"
      bind:this={chunkRefs[index]}
      class="flex items-center gap-3 p-2 rounded-md text-left transition-all duration-200
        {isSelected 
          ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700' 
          : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'
        }
        {chunk.status === 'error' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : ''}
        {isActiveProcessing ? 'ring-2 ring-blue-400 dark:ring-blue-500 animate-pulse bg-blue-50 dark:bg-blue-900/20' : ''}
      "
      onclick={() => handleChunkClick(index)}
      onkeydown={(e) => handleKeyDown(e, index)}
      aria-pressed={isSelected}
      aria-label="Chunk {index + 1}: {truncateText(chunk.rawText)}"
    >
      <!-- Status dots -->
      <div class="flex items-center gap-1 shrink-0" title="Status: {chunk.status}">
        <!-- Formatting status -->
        <ChunkProgressIndicator 
          status={['formatting', 'formatted'].includes(chunk.status) ? chunk.status : 'pending'}
          size="sm"
        />
        <!-- Analysis status -->
        <ChunkProgressIndicator 
          status={chunk.status === 'analyzed' || chunk.status === 'refined' ? 'analyzed' : chunk.status === 'analyzing' ? 'analyzing' : 'pending'}
          size="sm"
        />
        <!-- Refinement status -->
        <ChunkProgressIndicator 
          status={chunk.status === 'refined' ? 'refined' : chunk.status === 'refining' ? 'refining' : 'pending'}
          size="sm"
        />
      </div>

      <!-- Chunk content preview -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono text-gray-500 dark:text-slate-400">
            #{index + 1}
          </span>
          {#if isActiveProcessing}
            <span class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
              Processing
            </span>
          {:else if isCompleted}
            <span class="text-xs text-green-600 dark:text-green-400">
              ✓
            </span>
          {/if}
          <span class="text-xs font-mono text-gray-400 dark:text-slate-500">
            {chunk.rawTokenCount} tokens
          </span>
        </div>
        <div class="text-sm text-gray-800 dark:text-slate-200 truncate">
          {truncateText(chunk.rawText)}
        </div>
      </div>

      <!-- Modified indicator -->
      {#if chunk.wasModified}
        <span class="text-xs text-amber-600 dark:text-amber-400 shrink-0" title="Was modified during refinement">
          ✎
        </span>
      {/if}

      <!-- Error indicator -->
      {#if chunk.status === 'error'}
        <span class="text-xs text-red-600 dark:text-red-400 shrink-0" title={chunk.error ?? 'Error'}>
          ⚠
        </span>
      {/if}
    </button>
  {/each}
</div>

{#if chunks.length === 0}
  <div class="flex items-center justify-center h-[200px] text-gray-400 dark:text-slate-500">
    No chunks available
  </div>
{/if}
