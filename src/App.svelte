<script lang="ts">
  /**
   * App — root Svelte component.
   *
   * Thin orchestration layer: delegates all state to stores.
   * onMount calls appStore.init() which handles theme, WebGPU, SW, etc.
   */

  import { onMount } from 'svelte';
  import StatusBar from './components/StatusBar.svelte';
  import Launcher from './components/Launcher.svelte';
  import ChatPage from './components/ChatPage.svelte';
  import { getAppState, setScreen, init as appInit } from './stores/appStore.svelte';
  import { getEngineState } from './stores/engineStore.svelte';
  import { WEBGPU_BROWSER_RECOMMENDATIONS } from './engine/webgpu-check';

  const appState = getAppState();
  const engineState = getEngineState();

  onMount(() => {
    appInit();
  });

  function handleModelLoaded(modelId: string): void {
    setScreen('chat');
  }
</script>

<div id="app-root">
  <StatusBar />

  <main class="main-content">
    {#if appState.webgpu.available === false}
      <!-- WebGPU not available error screen -->
      <h1 class="title">WebLM — Local AI Chat</h1>
      <div class="error-message">
        <h3>⚠️ WebGPU Not Available</h3>
        <p>{appState.webgpu.reason ?? 'WebGPU is required for this application to run.'}</p>
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

    {:else if appState.screen === 'launcher'}
      <Launcher onModelLoaded={handleModelLoaded} />

    {:else if appState.screen === 'chat'}
      <ChatPage modelId={engineState.currentModelId ?? ''} />
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
