<script lang="ts">
  /**
   * MessageInput component.
   * Auto-resizing textarea with Send/Stop buttons and Enter-to-send.
   */

  interface Props {
    disabled?: boolean;
    isGenerating?: boolean;
    onSend: (message: string) => void;
    onStop: () => void;
  }

  let { disabled = false, isGenerating = false, onSend, onStop }: Props = $props();

  let value = $state('');
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  const canSend = $derived(value.trim().length > 0 && !disabled && !isGenerating);

  $effect(() => {
    // Focus textarea when component mounts
    textareaEl?.focus();
  });

  function handleInput(): void {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 200)}px`;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleSend(): void {
    const text = value.trim();
    if (!text || disabled || isGenerating) return;
    value = '';
    // Reset height
    if (textareaEl) {
      textareaEl.style.height = 'auto';
    }
    onSend(text);
  }

  export function focus(): void {
    textareaEl?.focus();
  }
</script>

<div class="flex gap-2 p-3" role="form" aria-label="Message input form">
  <textarea
    class="flex-1 px-3 py-2 text-base font-[inherit] leading-6 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg resize-none outline-none transition-[border-color] duration-150 focus:border-indigo-600 dark:focus:border-indigo-400 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-gray-500 dark:placeholder:text-slate-400"
    placeholder="Type a message..."
    rows={1}
    aria-label="Message input"
    disabled={disabled || isGenerating}
    bind:value
    bind:this={textareaEl}
    oninput={handleInput}
    onkeydown={handleKeydown}
  ></textarea>

  <div class="flex gap-2 items-end">
    {#if isGenerating}
      <button
        class="btn btn-danger"
        aria-label="Stop generation"
        onclick={onStop}
      >
        Stop
      </button>
    {:else}
      <button
        class="btn"
        aria-label="Send message"
        disabled={!canSend}
        onclick={handleSend}
      >
        Send
      </button>
    {/if}
  </div>
</div>
