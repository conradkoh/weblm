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
  class="progress-container"
  role="progressbar"
  aria-label="Model download progress"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={progress ? Math.round(progress.progress) : 0}
>
  <div class="progress-info">
    <span class="progress-phase">{phaseLabel()}</span>
    <span class="progress-percent">{progress ? Math.round(progress.progress) : 0}%</span>
  </div>

  <div class="progress-bar-outer">
    <div
      class="progress-bar-inner"
      aria-hidden="true"
      style="width: {progress ? progress.progress : 0}%"
    ></div>
  </div>

  {#if progress?.timeElapsed !== undefined}
    <div class="progress-time">Time elapsed: {Math.round(progress.timeElapsed)}s</div>
  {:else}
    <div class="progress-time">Time elapsed: 0s</div>
  {/if}

  {#if error}
    <div class="progress-error" role="alert">
      <p class="error-message">{error}</p>
      {#if onRetry}
        <button class="retry-button" aria-label="Retry loading model" onclick={onRetry}>
          Try Again
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .progress-container {
    width: 100%;
    max-width: 500px;
    margin-top: var(--spacing-lg);
    padding: var(--spacing-lg);
    background-color: var(--color-surface);
    border-radius: var(--border-radius);
    border: 1px solid var(--color-border);
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .progress-phase {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-percent {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-primary);
    margin-left: var(--spacing-sm);
  }

  .progress-bar-outer {
    width: 100%;
    height: 8px;
    background-color: var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar-inner {
    height: 100%;
    background-color: var(--color-primary);
    border-radius: 4px;
    transition: width 0.2s ease;
  }

  .progress-time {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-top: var(--spacing-sm);
  }

  .progress-error {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: #fef2f2;
    border: 1px solid var(--color-error);
    border-radius: var(--border-radius);
  }

  .error-message {
    color: var(--color-error);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .retry-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    font-family: inherit;
    color: white;
    background-color: var(--color-primary);
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .retry-button:hover {
    background-color: #4338ca;
  }
</style>
