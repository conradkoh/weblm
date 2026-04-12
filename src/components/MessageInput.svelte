<script lang="ts">
  /**
   * MessageInput component.
   * Auto-resizing textarea with Send/Stop buttons and Enter-to-send.
   */

  import { Button } from '$ui/button';
  import { Textarea } from '$ui/textarea';

  interface Props {
    disabled?: boolean;
    isGenerating?: boolean;
    onSend: (message: string) => void;
    onStop: () => void;
  }

  let { disabled = false, isGenerating = false, onSend, onStop }: Props = $props();

  let value = $state('');
  let textareaRef: HTMLTextAreaElement | null = $state(null);

  const canSend = $derived(value.trim().length > 0 && !disabled && !isGenerating);

  $effect(() => {
    // Focus textarea when component mounts
    textareaRef?.focus();
  });

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
    onSend(text);
  }

  export function focus(): void {
    textareaRef?.focus();
  }
</script>

<div class="flex gap-2 p-3" role="form" aria-label="Message input form">
  <Textarea
    bind:ref={textareaRef}
    bind:value
    class="flex-1 min-h-[40px] max-h-[200px] resize-none text-base leading-6"
    placeholder="Type a message..."
    rows={1}
    aria-label="Message input"
    disabled={disabled || isGenerating}
    onkeydown={handleKeydown}
  />

  <div class="flex gap-2 items-end">
    {#if isGenerating}
      <Button
        variant="destructive"
        aria-label="Stop generation"
        onclick={onStop}
      >
        Stop
      </Button>
    {:else}
      <Button
        aria-label="Send message"
        disabled={!canSend}
        onclick={handleSend}
      >
        Send
      </Button>
    {/if}
  </div>
</div>
