<script lang="ts">
  /**
   * Metrics component.
   * Shows generation performance metrics (TTFT, tokens/sec, total time).
   */

  import type { GenerationMetrics } from '../stores/types';
  import { Badge } from '$ui/badge';

  export type { GenerationMetrics };

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
  <div class="flex gap-2 mt-1 flex-wrap">
    <Badge variant="outline" class="text-[11px] rounded-full" title="Time to first token">
      TTFT: {formatTTFT(metrics.ttft)}
    </Badge>
    <Badge variant="outline" class="text-[11px] rounded-full" title="Tokens per second">
      {formatTPS(metrics.tokensPerSecond)}
    </Badge>
    <Badge variant="outline" class="text-[11px] rounded-full" title="Total generation time">
      {formatTime(metrics.totalTime)}
    </Badge>
  </div>
{/if}
