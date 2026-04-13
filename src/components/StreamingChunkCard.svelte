<script lang="ts">
  /**
   * StreamingChunkCard - renders a single chunk card with progressive states.
   * Shows shimmer for pending, streaming text with cursor, or rendered markdown.
   */

  import { renderMarkdown } from '$lib/markdown';

  interface Props {
    content: string | null;
    index: number;
    status: 'pending' | 'streaming' | 'complete';
    streamingText?: string;
    onRetry?: () => void;
  }
  
  let { content, index, status, streamingText = '', onRetry }: Props = $props();

  // Render markdown for completed content
  const renderedContent = $derived(
    status === 'complete' && content ? renderMarkdown(content) : ''
  );
</script>

<div
  class="streaming-chunk-card rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-opacity duration-300"
  class:animate-in={status !== 'pending'}
>
  <!-- Header with chunk number -->
  <div class="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-gray-500 dark:text-slate-400">
        Chunk {index + 1}
      </span>
      {#if status === 'complete'}
        <span class="text-xs text-green-600 dark:text-green-400">✓</span>
      {:else if status === 'streaming'}
        <span class="text-xs text-amber-500">◐</span>
      {:else}
        <span class="text-xs text-gray-400">○</span>
      {/if}
    </div>
    {#if status === 'complete' && onRetry}
      <button 
        type="button"
        onclick={onRetry}
        class="opacity-0 hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
        title="Retry this chunk"
      >
        ↻ Retry
      </button>
    {/if}
  </div>

  <!-- Content area -->
  <div class="p-3 min-h-[80px]">
    {#if status === 'pending'}
      <!-- Shimmer/skeleton placeholder -->
      <div class="space-y-2">
        <div class="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-full"></div>
        <div class="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-4/5"></div>
        <div class="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
      </div>
    {:else if status === 'streaming'}
      <!-- Streaming content with blinking cursor -->
      <div class="font-mono text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words">
        {streamingText}<span class="animate-pulse">▊</span>
      </div>
    {:else if status === 'complete' && content}
      <!-- Rendered markdown content -->
      <div class="prose prose-sm dark:prose-invert max-w-none">
        {@html renderedContent}
      </div>
    {/if}
  </div>
</div>

<style>
  .streaming-chunk-card {
    opacity: 0;
  }

  .streaming-chunk-card.animate-in {
    animation: fadeSlideIn 0.3s ease-out forwards;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
