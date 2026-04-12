<script lang="ts">
  /**
   * ChatMessages component.
   * Scrollable list of chat messages with auto-scroll.
   */

  import { tick } from 'svelte';
  import ChatMessageItem from './ChatMessage.svelte';
  import type { ChatMessage } from '../types';
  import { ScrollArea } from '$ui/scroll-area';

  interface Props {
    messages: ChatMessage[];
  }

  let { messages }: Props = $props();

  // viewportRef gives us access to the ScrollArea's scrollable viewport
  let viewportRef: HTMLElement | null = $state(null);

  // Auto-scroll when messages change
  $effect(() => {
    // Reference messages to track changes
    void messages.length;
    void messages[messages.length - 1];
    tick().then(() => scrollToBottom());
  });

  function scrollToBottom(): void {
    const el = viewportRef;
    if (!el) return;
    const threshold = 100;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }

  // Expose scroll to bottom for external call (e.g. after token stream)
  export function forceScrollToBottom(): void {
    if (viewportRef) {
      viewportRef.scrollTop = viewportRef.scrollHeight;
    }
  }
</script>

<ScrollArea
  class="flex-1 h-full"
  bind:viewportRef
  id="chat-messages"
>
  <div
    class="p-4 flex flex-col gap-4"
    role="log"
    aria-live="polite"
    aria-label="Chat messages"
  >
    {#each messages as message (message.id)}
      <ChatMessageItem {message} />
    {/each}
  </div>
</ScrollArea>
