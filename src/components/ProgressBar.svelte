<script lang="ts">
  /**
   * ProgressBar component.
   * Displays model download/compile progress with phase label, percentage, and elapsed time.
   */

  import type { ModelProgress } from '../engine/types';

  interface Props {
    progress: ModelProgress | null;
    error?: string | null;
    onRetry?: () => void;
  }

  let { progress = null, error = null, onRetry }: Props = $props();

  const phaseLabel = $derived(() => {
    if (!progress) return 'Initializing...';
    if (progress.message) return progress.message;
    switch (progress.phase) {
      case 'downloading': return 'Downloading model...';
      case 'compiling':   return 'Compiling model...';
      case 'loading':     return 'Initializing...';
      case 'ready':       return 'Ready!';
      default:            return 'Loading...';
    }
  });
</script>

<div
  class="w-full max-w-[500px] mt-6 p-6 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
  role="progressbar"
  aria-label="Model download progress"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={progress ? Math.round(progress.progress) : 0}
>
  <div class="flex justify-between items-center mb-2">
    <span class="text-sm text-gray-900 dark:text-slate-100 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
      {phaseLabel()}
    </span>
    <span class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 ml-2">
      {progress ? Math.round(progress.progress) : 0}%
    </span>
  </div>

  <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
    <div
      class="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-[width] duration-200 ease-linear"
      aria-hidden="true"
      style="width: {progress ? progress.progress : 0}%"
    ></div>
  </div>

  {#if progress?.timeElapsed !== undefined}
    <div class="text-sm text-gray-500 dark:text-slate-400 mt-2">Time elapsed: {Math.round(progress.timeElapsed)}s</div>
  {:else}
    <div class="text-sm text-gray-500 dark:text-slate-400 mt-2">Time elapsed: 0s</div>
  {/if}

  {#if error}
    <div class="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-500 rounded-lg" role="alert">
      <p class="text-red-500 text-sm m-0 mb-2">{error}</p>
      {#if onRetry}
        <button class="btn text-sm px-4 py-1" aria-label="Retry loading model" onclick={onRetry}>
          Try Again
        </button>
      {/if}
    </div>
  {/if}
</div>
