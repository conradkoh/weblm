/**
 * Performance metrics display and tracking.
 *
 * Responsibilities:
 * - Track Time to First Token (TTFT)
 * - Track tokens per second during generation
 * - Display metrics in UI (opt-in via settings)
 * - Persist metrics display preference
 */

/** Storage key for metrics display preference */
const METRICS_ENABLED_KEY = 'weblm-show-metrics';

/** Performance metrics for a single generation */
export interface GenerationMetrics {
  /** Time to first token in milliseconds */
  ttft: number;
  /** Total generation time in milliseconds */
  totalTime: number;
  /** Number of tokens generated */
  tokenCount: number;
  /** Tokens per second */
  tokensPerSecond: number;
  /** Timestamp of generation */
  timestamp: number;
}

/** Metrics tracker state */
interface MetricsState {
  enabled: boolean;
  generationStartTime: number;
  firstTokenTime: number | null;
  tokenCount: number;
}

const state: MetricsState = {
  enabled: false,
  generationStartTime: 0,
  firstTokenTime: null,
  tokenCount: 0,
};

/** Callbacks for metrics updates */
type MetricsCallback = (metrics: GenerationMetrics) => void;
const metricsCallbacks: MetricsCallback[] = [];

/**
 * Check if metrics display is enabled.
 */
export function isMetricsEnabled(): boolean {
  return state.enabled;
}

/**
 * Enable or disable metrics display.
 */
export function setMetricsEnabled(enabled: boolean): void {
  state.enabled = enabled;
  try {
    localStorage.setItem(METRICS_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load metrics preference from localStorage.
 */
export function loadMetricsPreference(): void {
  try {
    const stored = localStorage.getItem(METRICS_ENABLED_KEY);
    state.enabled = stored === 'true';
  } catch {
    state.enabled = false;
  }
}

/**
 * Subscribe to metrics updates.
 */
export function onMetrics(callback: MetricsCallback): () => void {
  metricsCallbacks.push(callback);
  return () => {
    const index = metricsCallbacks.indexOf(callback);
    if (index > -1) {
      metricsCallbacks.splice(index, 1);
    }
  };
}

/**
 * Start tracking a new generation.
 */
export function startGeneration(): void {
  state.generationStartTime = performance.now();
  state.firstTokenTime = null;
  state.tokenCount = 0;
}

/**
 * Record first token time (TTFT).
 */
export function recordFirstToken(): void {
  if (state.firstTokenTime === null) {
    state.firstTokenTime = performance.now();
  }
}

/**
 * Increment token count.
 */
export function incrementTokenCount(): void {
  state.tokenCount++;
}

/**
 * Complete generation and calculate metrics.
 */
export function completeGeneration(): GenerationMetrics | null {
  if (!state.enabled) {
    return null;
  }

  const endTime = performance.now();
  const totalTime = endTime - state.generationStartTime;
  const ttft = state.firstTokenTime 
    ? state.firstTokenTime - state.generationStartTime 
    : 0;
  
  const tokensPerSecond = state.tokenCount > 0 && totalTime > 0
    ? (state.tokenCount / totalTime) * 1000
    : 0;

  const metrics: GenerationMetrics = {
    ttft,
    totalTime,
    tokenCount: state.tokenCount,
    tokensPerSecond,
    timestamp: Date.now(),
  };

  // Notify subscribers
  metricsCallbacks.forEach(callback => callback(metrics));

  return metrics;
}

/**
 * Format TTFT for display.
 */
export function formatTTFT(ttftMs: number): string {
  if (ttftMs < 1000) {
    return `${Math.round(ttftMs)}ms`;
  }
  return `${(ttftMs / 1000).toFixed(1)}s`;
}

/**
 * Format tokens per second for display.
 */
export function formatTokensPerSecond(tps: number): string {
  return `${tps.toFixed(1)} t/s`;
}

/**
 * Format total time for display.
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Create a metrics display element for a message.
 */
export function createMetricsElement(metrics: GenerationMetrics): HTMLElement {
  const container = document.createElement('div');
  container.className = 'message-metrics';
  container.innerHTML = `
    <span class="metric" title="Time to first token">TTFT: ${formatTTFT(metrics.ttft)}</span>
    <span class="metric" title="Tokens per second">${formatTokensPerSecond(metrics.tokensPerSecond)}</span>
    <span class="metric" title="Total generation time">${formatTime(metrics.totalTime)}</span>
  `;
  return container;
}

/**
 * Estimate token count from text (approximate).
 * This is used when streaming doesn't provide explicit token counts.
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: ~4 characters per token for English
  // This is a simplistic estimate; actual tokenization varies
  return Math.ceil(text.length / 4);
}