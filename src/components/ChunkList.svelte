<script lang="ts">
  /**
   * ChunkList component for pipeline observability.
   * Displays chunks with their status through the refinement pipeline.
   * Replaces source textarea when processing has started.
   */

  import { getFormatterState, selectChunkForInspection } from '../stores/formatterStore.svelte';
  import type { ChunkPipelineData } from '../stores/types';

  interface Props {
    chunks: ChunkPipelineData[];
    selectedIndex: number | null;
    onSelectChunk: (index: number) => void;
  }

  let { chunks, selectedIndex, onSelectChunk }: Props = $props();

  const formatterState = getFormatterState();

  // Helper to get status dot style for each pipeline stage
  function getStatusDot(status: ChunkPipelineData['status'], expected: 'formatted' | 'analyzed' | 'refined' | 'error'): {
    icon: string;
    color: string;
    bgColor: string;
  } {
    const colorMap = {
      formatted: {
        icon: '✓',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      },
      analyzed: {
        icon: '✓',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      },
      refined: {
        icon: '✓',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      },
      error: {
        icon: '✗',
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
      },
      pending: {
        icon: '○',
        color: 'text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
      },
      formatting: {
        icon: '◐',
        color: 'text-amber-500',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      },
      analyzing: {
        icon: '◐',
        color: 'text-amber-500',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      },
      refining: {
        icon: '◐',
        color: 'text-amber-500',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      },
    };

    return colorMap[status] ?? colorMap.pending;
  }

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

<div class="flex flex-col gap-1 overflow-y-auto max-h-[300px] min-h-[200px]">
  {#each chunks as chunk, index (chunk.index)}
    {@const isSelected = selectedIndex === index}
    {@const statusFormatted = getStatusDot(chunk.status, 'formatted')}
    {@const statusAnalyzed = getStatusDot(chunk.status === 'analyzed' || chunk.status === 'refined' ? 'analyzed' : chunk.status === 'analyzing' ? 'analyzing' : 'pending', 'analyzed')}
    {@const statusRefined = getStatusDot(chunk.status === 'refined' ? 'refined' : chunk.status === 'refining' ? 'refining' : 'pending', 'refined')}
    
    <button
      type="button"
      class="flex items-center gap-3 p-2 rounded-md text-left transition-colors
        {isSelected 
          ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700' 
          : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'
        }
        {chunk.status === 'error' ? 'border-red-300 dark:border-red-700' : ''}
      "
      onclick={() => handleChunkClick(index)}
      onkeydown={(e) => handleKeyDown(e, index)}
      aria-pressed={isSelected}
      aria-label="Chunk {index + 1}: {truncateText(chunk.rawText)}"
    >
      <!-- Status dots -->
      <div class="flex items-center gap-1 shrink-0" title="Status: {chunk.status}">
        <!-- Formatting status -->
        <span class="w-3 h-3 rounded-full {statusFormatted.bgColor} {statusFormatted.color} text-[10px] font-bold flex items-center justify-center">
          {statusFormatted.icon}
        </span>
        <!-- Analysis status -->
        <span class="w-3 h-3 rounded-full {statusAnalyzed.bgColor} {statusAnalyzed.color} text-[10px] font-bold flex items-center justify-center">
          {statusAnalyzed.icon}
        </span>
        <!-- Refinement status -->
        <span class="w-3 h-3 rounded-full {statusRefined.bgColor} {statusRefined.color} text-[10px] font-bold flex items-center justify-center">
          {statusRefined.icon}
        </span>
      </div>

      <!-- Chunk content preview -->
      <div class="flex-1 min-w-0">
        <div class="text-xs font-mono text-gray-500 dark:text-slate-400 mb-0.5">
          #{index + 1} · {chunk.rawTokenCount} tokens
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
