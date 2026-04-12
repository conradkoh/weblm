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
  <div
    class="settings-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    onclick={handleOverlayClick}
  >
    <div class="bg-white dark:bg-slate-900 rounded-lg shadow-md max-w-[500px] w-[90%] max-h-[80vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 id="settings-title" class="m-0 text-lg font-semibold text-gray-900 dark:text-slate-100">Settings</h2>
        <button
          class="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-lg cursor-pointer text-gray-500 dark:text-slate-400 text-base transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
          aria-label="Close settings"
          onclick={onClose}
        >✕</button>
      </div>

      <!-- Content -->
      <div class="p-4 flex flex-col gap-6">

        <!-- Generation Parameters -->
        <div class="flex flex-col gap-2">
          <h3 class="m-0 text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Generation</h3>
          <label class="flex flex-col gap-1 text-sm text-gray-900 dark:text-slate-100">
            Temperature: {temperature.toFixed(2)}
            <input type="range" min="0" max="2" step="0.05" bind:value={temperature} class="w-full" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-900 dark:text-slate-100">
            Max Tokens: {maxTokens}
            <input type="range" min="256" max="8192" step="256" bind:value={maxTokens} class="w-full" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-900 dark:text-slate-100">
            Top-P: {topP.toFixed(2)}
            <input type="range" min="0" max="1" step="0.05" bind:value={topP} class="w-full" />
          </label>
        </div>

        <!-- System Prompt -->
        <div class="flex flex-col gap-2">
          <h3 class="m-0 text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">System Prompt</h3>
          <textarea
            class="w-full px-3 py-2 text-sm font-[inherit] text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg resize-y outline-none transition-[border-color] duration-150 focus:border-indigo-600 dark:focus:border-indigo-400"
            rows={4}
            placeholder="Enter system prompt..."
            bind:value={systemPrompt}
          ></textarea>
        </div>

        <!-- Theme -->
        <div class="flex flex-col gap-2">
          <h3 class="m-0 text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Theme</h3>
          <div class="flex gap-4">
            {#each ['light', 'dark', 'system'] as t (t)}
              <label class="flex items-center gap-1 text-sm cursor-pointer text-gray-900 dark:text-slate-100">
                <input type="radio" name="theme" value={t} bind:group={theme} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            {/each}
          </div>
        </div>

        <!-- Metrics -->
        <div class="flex flex-col gap-2">
          <h3 class="m-0 text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Performance</h3>
          <label class="flex items-center gap-2 text-sm cursor-pointer text-gray-900 dark:text-slate-100">
            <input type="checkbox" bind:checked={showMetrics} />
            Show generation metrics
          </label>
        </div>

        <!-- Export -->
        <div class="flex flex-col gap-2">
          <h3 class="m-0 text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Export Chat</h3>
          <div class="flex gap-2 flex-wrap">
            <button class="btn btn-secondary" onclick={() => exportChatAsText(messages)}>
              Export as Text
            </button>
            <button class="btn btn-secondary" onclick={() => exportChatAsMarkdown(messages)}>
              Export as Markdown
            </button>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
        <button class="btn btn-secondary" onclick={onClose}>Cancel</button>
        <button class="btn" onclick={handleSave}>Save</button>
      </div>
    </div>
  </div>
{/if}
