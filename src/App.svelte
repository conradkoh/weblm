<script lang="ts">
  /**
   * App — root Svelte component.
   *
   * Manages top-level app state:
   * - Theme initialization
   * - Service worker / offline detection
   * - WebGPU check
   * - Screen transitions: launcher → chat
   */

  import { onMount } from 'svelte';
  import StatusBar from './components/StatusBar.svelte';
  import Launcher from './components/Launcher.svelte';
  import ChatPage from './components/ChatPage.svelte';
  import { checkWebGPUSupport, WEBGPU_BROWSER_RECOMMENDATIONS } from './engine/webgpu-check';
  import { loadSettings, getEffectiveTheme } from './settings';
  import { applyThemeByName, watchSystemTheme } from './lib/themes';
  import { registerServiceWorker, setupOfflineDetection, onOfflineStatusChange } from './sw';
  import { logger } from './logger';
  import { getModelInfo } from './config';

  // ── App state ────────────────────────────────────────────────
  type Screen = 'launcher' | 'chat';

  let screen: Screen = $state('launcher');

  // Status bar state
  let webgpuAvailable: boolean | null = $state(null);
  let webgpuReason: string | undefined = $state(undefined);
  let online = $state(navigator.onLine);
  let modelName: string | null = $state(null);
  let modelLoading = $state(false);
  let offlineReady = $state(false);

  // Active model after loading
  let loadedModelId: string | null = $state(null);

  // ── Lifecycle ────────────────────────────────────────────────
  onMount(() => {
    // Apply theme
    const settings = loadSettings();
    applyThemeByName(settings.theme);
    if (settings.theme === 'system') {
      watchSystemTheme(() => applyThemeByName('system'));
    }

    // Online/offline listeners
    window.addEventListener('online', () => { online = true; });
    window.addEventListener('offline', () => { online = false; });

    // WebGPU check
    checkWebGPUSupport().then(caps => {
      webgpuAvailable = caps.isAvailable;
      webgpuReason = caps.unavailableReason;
    });

    // Service worker + offline detection
    registerServiceWorker().then(() => {
      setupOfflineDetection();
      onOfflineStatusChange((isOffline, isReady) => {
        online = !isOffline;
        if (isReady) offlineReady = true;
      });
    });

    logger.info('App mounted');
  });

  // ── Handlers ─────────────────────────────────────────────────

  function handleModelLoaded(modelId: string): void {
    loadedModelId = modelId;
    const info = getModelInfo(modelId);
    modelName = info?.displayName ?? modelId;
    modelLoading = false;
    screen = 'chat';
    logger.info(`model loaded: ${modelId}`);
  }
</script>

<div id="app-root">
  <StatusBar
    {webgpuAvailable}
    {webgpuReason}
    {online}
    {modelName}
    {modelLoading}
    {offlineReady}
  />

  <main class="main-content">
    {#if webgpuAvailable === false}
      <!-- WebGPU not available error screen -->
      <h1 class="title">WebLM — Local AI Chat</h1>
      <div class="error-message">
        <h3>⚠️ WebGPU Not Available</h3>
        <p>{webgpuReason ?? 'WebGPU is required for this application to run.'}</p>
        <p style="margin-top: var(--spacing-sm);">Supported browsers:</p>
        <ul style="margin-left: var(--spacing-md); margin-top: var(--spacing-sm);">
          {#each WEBGPU_BROWSER_RECOMMENDATIONS as browser (browser)}
            <li>{browser}</li>
          {/each}
        </ul>
        <p style="margin-top: var(--spacing-sm);">
          If you're using a supported browser, ensure hardware acceleration is enabled.
        </p>
      </div>

    {:else if screen === 'launcher'}
      <Launcher onModelLoaded={handleModelLoaded} />

    {:else if screen === 'chat'}
      <ChatPage modelId={loadedModelId ?? ''} />
    {/if}
  </main>
</div>

<style>
  #app-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Error screen */
  .title {
    font-size: var(--font-size-xl);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-lg);
  }

  .error-message {
    background-color: #fef2f2;
    border: 1px solid var(--color-error);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    margin: 0 var(--spacing-lg) var(--spacing-lg);
    max-width: 500px;
  }

  .error-message h3 {
    color: var(--color-error);
    margin-bottom: var(--spacing-sm);
  }

  .error-message ul {
    margin-left: var(--spacing-md);
    margin-top: var(--spacing-sm);
  }

  .error-message li {
    color: var(--color-text-secondary);
    margin: var(--spacing-xs) 0;
  }

/* Global CSS variables and base styles */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --color-primary: #4f46e5;
    --color-background: #ffffff;
    --color-surface: #f9fafb;
    --color-text: #111827;
    --color-text-secondary: #6b7280;
    --color-border: #e5e7eb;
    --color-error: #ef4444;
    --color-success: #22c55e;

    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    --font-size-base: 16px;
    --font-size-sm: 14px;
    --font-size-lg: 18px;
    --font-size-xl: 24px;

    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    --border-radius: 8px;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  :global(body) {
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    line-height: 1.5;
    color: var(--color-text);
    background-color: var(--color-background);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(#app) {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
