<script lang="ts">
  /**
   * StatusBar component.
   * Displays WebGPU status, online/offline, model status, and offline-ready indicators.
   */

  interface Props {
    webgpuAvailable: boolean | null;
    webgpuReason?: string;
    online: boolean;
    modelName: string | null;
    modelLoading: boolean;
    offlineReady: boolean;
  }

  let {
    webgpuAvailable = null,
    webgpuReason = '',
    online = true,
    modelName = null,
    modelLoading = false,
    offlineReady = false,
  }: Props = $props();
</script>

<div class="status-bar" role="status" aria-live="polite" aria-label="Application status">
  <!-- WebGPU status -->
  <div class="status-indicator" id="webgpu-status" aria-label="WebGPU status" title={webgpuAvailable === false ? (webgpuReason ?? 'WebGPU is not available') : ''}>
    {#if webgpuAvailable === null}
      <span class="status-dot loading" aria-hidden="true"></span>
      <span>Checking WebGPU...</span>
    {:else if webgpuAvailable}
      <span class="status-dot success" aria-hidden="true"></span>
      <span>WebGPU Available</span>
    {:else}
      <span class="status-dot error" aria-hidden="true"></span>
      <span>WebGPU Unavailable</span>
    {/if}
  </div>

  <!-- Online/offline status -->
  <div class="status-indicator" id="online-status" aria-label="Connection status">
    <span class="status-dot {online ? 'success' : 'error'}" aria-hidden="true"></span>
    <span>{online ? 'Online' : 'Offline'}</span>
  </div>

  <!-- Offline ready badge -->
  {#if offlineReady}
    <div class="status-indicator" id="offline-ready-status" title="App is cached and can work offline">
      <span class="status-dot success" aria-hidden="true"></span>
      <span>Offline Ready ✓</span>
    </div>
  {/if}

  <!-- Model status -->
  {#if modelLoading || modelName}
    <div class="status-indicator" id="model-status" aria-label="Model status">
      {#if modelLoading}
        <span class="status-dot loading" aria-hidden="true"></span>
        <span>Loading model...</span>
      {:else if modelName}
        <span class="status-dot success" aria-hidden="true"></span>
        <span>Model: {modelName}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.success {
    background-color: var(--color-success);
  }

  .status-dot.error {
    background-color: var(--color-error);
  }

  .status-dot.loading {
    background-color: var(--color-text-secondary);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
