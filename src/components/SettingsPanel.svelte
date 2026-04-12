<script lang="ts">
  /**
   * SettingsPanel component.
   * Modal dialog for adjusting generation parameters, system prompt, theme, and export.
   * Reads from and writes to the settings store.
   */

  import { getSettingsState, applySettings } from '../stores/settingsStore.svelte';
  import { exportChatAsText, exportChatAsMarkdown } from '../app/export';
  import type { ChatMessage } from '../types';
  import type { Theme } from '../stores/types';

  interface Props {
    open: boolean;
    messages: ChatMessage[];
    onClose: () => void;
  }

  let { open, messages, onClose }: Props = $props();

  const settings = getSettingsState();

  // Local copies for editing (avoid mutating store until Save)
  let temperature = $state(settings.temperature);
  let maxTokens = $state(settings.maxTokens);
  let topP = $state(settings.topP);
  let systemPrompt = $state(settings.systemPrompt);
  let theme = $state<Theme>(settings.theme);
  let showMetrics = $state(settings.showMetrics);

  // Re-sync local copies when panel opens
  $effect(() => {
    if (open) {
      temperature = settings.temperature;
      maxTokens = settings.maxTokens;
      topP = settings.topP;
      systemPrompt = settings.systemPrompt;
      theme = settings.theme;
      showMetrics = settings.showMetrics;
    }
  });

  function handleSave(): void {
    applySettings({ temperature, maxTokens, topP, systemPrompt, theme, showMetrics });
    onClose();
  }

  function handleOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('settings-overlay')) {
      onClose();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" onclick={handleOverlayClick}>
    <div class="settings-panel">
      <div class="settings-header">
        <h2 id="settings-title">Settings</h2>
        <button class="settings-close" aria-label="Close settings" onclick={onClose}>✕</button>
      </div>

      <div class="settings-content">

        <!-- Generation Parameters -->
        <div class="settings-section">
          <h3>Generation</h3>
          <label class="settings-label">
            Temperature: {temperature.toFixed(2)}
            <input type="range" min="0" max="2" step="0.05" bind:value={temperature} />
          </label>
          <label class="settings-label">
            Max Tokens: {maxTokens}
            <input type="range" min="256" max="8192" step="256" bind:value={maxTokens} />
          </label>
          <label class="settings-label">
            Top-P: {topP.toFixed(2)}
            <input type="range" min="0" max="1" step="0.05" bind:value={topP} />
          </label>
        </div>

        <!-- System Prompt -->
        <div class="settings-section">
          <h3>System Prompt</h3>
          <textarea
            class="settings-textarea"
            rows={4}
            placeholder="Enter system prompt..."
            bind:value={systemPrompt}
          ></textarea>
        </div>

        <!-- Theme -->
        <div class="settings-section">
          <h3>Theme</h3>
          <div class="settings-radio-group">
            {#each ['light', 'dark', 'system'] as t (t)}
              <label class="settings-radio">
                <input type="radio" name="theme" value={t} bind:group={theme} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            {/each}
          </div>
        </div>

        <!-- Metrics -->
        <div class="settings-section">
          <h3>Performance</h3>
          <label class="settings-checkbox">
            <input type="checkbox" bind:checked={showMetrics} />
            Show generation metrics
          </label>
        </div>

        <!-- Export -->
        <div class="settings-section">
          <h3>Export Chat</h3>
          <div class="settings-buttons">
            <button class="button button-secondary" onclick={() => exportChatAsText(messages)}>
              Export as Text
            </button>
            <button class="button button-secondary" onclick={() => exportChatAsMarkdown(messages)}>
              Export as Markdown
            </button>
          </div>
        </div>

      </div>

      <div class="settings-footer">
        <button class="button button-secondary" onclick={onClose}>Cancel</button>
        <button class="button" onclick={handleSave}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .settings-panel {
    background-color: var(--color-background);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-md);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
  }

  .settings-header h2 {
    margin: 0;
    font-size: var(--font-size-lg);
  }

  .settings-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: transparent;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: 16px;
  }

  .settings-close:hover {
    background-color: var(--color-surface);
    color: var(--color-text);
  }

  .settings-content {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .settings-section h3 {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .settings-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }

  .settings-label input[type="range"] {
    width: 100%;
  }

  .settings-textarea {
    width: 100%;
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    resize: vertical;
    outline: none;
  }

  .settings-textarea:focus {
    border-color: var(--color-primary);
  }

  .settings-radio-group {
    display: flex;
    gap: var(--spacing-md);
  }

  .settings-radio {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .settings-checkbox {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .settings-buttons {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .settings-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-top: 1px solid var(--color-border);
  }
</style>
