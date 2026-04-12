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

<div class="input-container" role="form" aria-label="Message input form">
  <textarea
    class="input-textarea"
    placeholder="Type a message..."
    rows={1}
    aria-label="Message input"
    disabled={disabled || isGenerating}
    bind:value
    bind:this={textareaEl}
    oninput={handleInput}
    onkeydown={handleKeydown}
  ></textarea>

  <div class="input-buttons">
    {#if isGenerating}
      <button
        class="button button-danger"
        aria-label="Stop generation"
        onclick={onStop}
      >
        Stop
      </button>
    {:else}
      <button
        class="button"
        aria-label="Send message"
        disabled={!canSend}
        onclick={handleSend}
      >
        Send
      </button>
    {/if}
  </div>
</div>

<style>
  .input-container {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }

  .input-textarea {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    font-family: inherit;
    line-height: 1.5;
    color: var(--color-text);
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    resize: none;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .input-textarea:focus {
    border-color: var(--color-primary);
  }

  .input-textarea:disabled {
    background-color: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: not-allowed;
  }

  .input-textarea::placeholder {
    color: var(--color-text-secondary);
  }

  .input-buttons {
    display: flex;
    gap: var(--spacing-sm);
    align-items: flex-end;
  }

  /* Button styles needed locally */
  :global(.button) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    font-family: inherit;
    line-height: 1.5;
    color: white;
    background-color: var(--color-primary);
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.15s ease, transform 0.1s ease;
  }

  :global(.button:hover) { background-color: #4338ca; }
  :global(.button:active) { transform: scale(0.98); }
  :global(.button:disabled) {
    background-color: var(--color-text-secondary);
    cursor: not-allowed;
    opacity: 0.7;
  }
  :global(.button-danger) { background-color: var(--color-error); }
  :global(.button-danger:hover) { background-color: #dc2626; }
</style>
