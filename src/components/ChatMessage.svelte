<script lang="ts">
  /**
   * ChatMessage component.
   * Renders a single chat message bubble with markdown, copy button, and timestamp.
   */

  import { renderMarkdown } from '../lib/markdown';
  import { highlightCode } from '../lib/highlight';
  import type { ChatMessage } from '../types';
  import { Button } from '$ui/button';

  interface Props {
    message: ChatMessage;
  }

  let { message }: Props = $props();

  // Track copy state per code block
  let messageCopied = $state(false);
  let messageCopyTimer: ReturnType<typeof setTimeout> | null = null;

  // Rendered HTML (only for assistant messages)
  const renderedHtml = $derived(() => {
    if (message.role !== 'assistant' || message.streaming) return '';
    return applyHighlighting(renderMarkdown(message.content));
  });

  // Format timestamp relative to now
  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  /**
   * Post-process rendered HTML to apply syntax highlighting to code blocks.
   * Uses a virtual DOM via DOMParser to avoid XSS risks.
   */
  function applyHighlighting(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('pre code').forEach(el => {
      const codeEl = el as HTMLElement;
      const langClass = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : 'text';
      codeEl.innerHTML = highlightCode(codeEl.textContent ?? '', lang);
    });
    return doc.body.innerHTML;
  }

  async function copyMessage(): Promise<void> {
    try {
      await navigator.clipboard.writeText(message.content);
      messageCopied = true;
      if (messageCopyTimer) clearTimeout(messageCopyTimer);
      messageCopyTimer = setTimeout(() => { messageCopied = false; }, 2000);
    } catch {
      // ignore
    }
  }
</script>

<div
  class="flex max-w-[80%] {message.role === 'user' ? 'ml-auto' : 'mr-auto'}"
  id="message-{message.id}"
  data-timestamp={message.timestamp}
  role="article"
  aria-label="{message.role === 'user' ? 'You' : 'Assistant'} message"
>
  <div
    class="px-3 py-2 rounded-lg max-w-full break-words
      {message.role === 'user'
        ? 'bg-indigo-600 text-white rounded-br-[4px] whitespace-pre-wrap'
        : 'bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 rounded-bl-[4px]'}"
  >
    <div class="leading-6" id="content-{message.id}">
      {#if message.streaming}
        <!-- Typing indicator -->
        <div class="flex gap-1 py-1" aria-label="Assistant is typing">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      {:else if message.role === 'assistant'}
        <!-- Markdown-rendered HTML -->
        <div class="chat-prose">{@html renderedHtml()}</div>
      {:else}
        <!-- Plain text for user / system -->
        {message.content}
      {/if}
    </div>

    <!-- Footer: timestamp + copy -->
    {#if !message.streaming}
      <div class="flex items-center justify-between gap-2 mt-1">
        <div class="text-[11px] opacity-70 {message.role === 'user' ? 'text-white/80' : 'text-gray-500 dark:text-slate-400'}">
          {formatTimestamp(message.timestamp)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="h-auto px-2 py-0.5 text-[11px] {messageCopied
            ? 'bg-green-500 text-white hover:bg-green-500'
            : message.role === 'user'
              ? 'text-white/80 hover:text-white hover:bg-white/20'
              : 'text-gray-500 dark:text-slate-400'}"
          aria-label="Copy message"
          title="Copy message"
          onclick={copyMessage}
        >
          {messageCopied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    {/if}
  </div>
</div>
