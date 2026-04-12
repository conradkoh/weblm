<script lang="ts">
  /**
   * ChatMessages component.
   * Scrollable list of chat messages with auto-scroll.
   */

  import { tick } from 'svelte';
  import ChatMessageItem from './ChatMessage.svelte';
  import type { ChatMessage } from '../types';

  interface Props {
    messages: ChatMessage[];
  }

  let { messages }: Props = $props();

  let containerEl: HTMLElement | undefined = $state();

  // Auto-scroll when messages change
  $effect(() => {
    // Reference messages to track changes
    void messages.length;
    void messages[messages.length - 1];
    tick().then(() => scrollToBottom());
  });

  function scrollToBottom(): void {
    if (!containerEl) return;
    const threshold = 100;
    const isNearBottom =
      containerEl.scrollHeight - containerEl.scrollTop - containerEl.clientHeight < threshold;
    if (isNearBottom) {
      containerEl.scrollTop = containerEl.scrollHeight;
    }
  }

  // Expose scroll to bottom for external call (e.g. after token stream)
  export function forceScrollToBottom(): void {
    if (containerEl) {
      containerEl.scrollTop = containerEl.scrollHeight;
    }
  }
</script>

<div
  class="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
  id="chat-messages"
  role="log"
  aria-live="polite"
  aria-label="Chat messages"
  bind:this={containerEl}
>
  {#each messages as message (message.id)}
    <ChatMessageItem {message} />
  {/each}
</div>
