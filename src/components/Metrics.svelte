<script lang="ts">
  /**
   * Metrics component.
   * Shows generation performance metrics (TTFT, tokens/sec, total time).
   */

  export interface GenerationMetrics {
    ttft: number;
    totalTime: number;
    tokenCount: number;
    tokensPerSecond: number;
  }

  interface Props {
    metrics?: GenerationMetrics | null;
  }

  let { metrics = null }: Props = $props();

  function formatTTFT(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
  }

  function formatTPS(tps: number): string {
    return `${tps.toFixed(1)} t/s`;
  }

  function formatTime(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = Math.round(s % 60);
    return `${m}m ${rem}s`;
  }
</script>

{#if metrics}
  <div class="message-metrics">
    <span class="metric" title="Time to first token">TTFT: {formatTTFT(metrics.ttft)}</span>
    <span class="metric" title="Tokens per second">{formatTPS(metrics.tokensPerSecond)}</span>
    <span class="metric" title="Total generation time">{formatTime(metrics.totalTime)}</span>
  </div>
{/if}

<style>
  .message-metrics {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .metric {
    font-size: 11px;
    color: var(--color-text-secondary);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 99px;
    padding: 1px 8px;
  }
</style>
