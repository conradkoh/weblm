<script lang="ts">
  /**
   * ChatMessage component.
   * Renders a single chat message bubble with markdown, copy button, and timestamp.
   */

  import { renderMarkdown } from '../ui/markdown';
  import { highlightCode } from '../ui/highlight';
  import type { ChatMessage } from '../types';

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
  class="chat-message chat-message-{message.role}"
  id="message-{message.id}"
  data-timestamp={message.timestamp}
  role="article"
  aria-label="{message.role === 'user' ? 'You' : 'Assistant'} message"
>
  <div class="chat-bubble">
    <div class="chat-content" id="content-{message.id}">
      {#if message.streaming}
        <!-- Typing indicator -->
        <div class="typing-indicator" aria-label="Assistant is typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      {:else if message.role === 'assistant'}
        <!-- Markdown-rendered HTML -->
        {@html renderedHtml()}
      {:else}
        <!-- Plain text for user / system -->
        {message.content}
      {/if}
    </div>

    <!-- Footer: timestamp + copy -->
    {#if !message.streaming}
      <div class="chat-message-footer">
        <div class="chat-timestamp">{formatTimestamp(message.timestamp)}</div>
        <button
          class="copy-btn {messageCopied ? 'copied' : ''}"
          aria-label="Copy message"
          title="Copy message"
          onclick={copyMessage}
        >
          {messageCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .chat-message {
    display: flex;
    max-width: 80%;
  }

  .chat-message-user {
    margin-left: auto;
  }

  .chat-message-assistant {
    margin-right: auto;
  }

  .chat-bubble {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius);
    max-width: 100%;
    word-wrap: break-word;
  }

  .chat-message-user .chat-bubble {
    background-color: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
    white-space: pre-wrap;
  }

  .chat-message-assistant .chat-bubble {
    background-color: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-bottom-left-radius: 4px;
  }

  .chat-content {
    line-height: 1.5;
  }

  /* Markdown styles inside assistant bubbles */
  .chat-message-assistant .chat-content :global(p) {
    margin-bottom: var(--spacing-sm);
  }

  .chat-message-assistant .chat-content :global(h1),
  .chat-message-assistant .chat-content :global(h2),
  .chat-message-assistant .chat-content :global(h3) {
    margin: var(--spacing-sm) 0;
    font-weight: 600;
  }

  .chat-message-assistant .chat-content :global(ul),
  .chat-message-assistant .chat-content :global(ol) {
    padding-left: var(--spacing-lg);
    margin-bottom: var(--spacing-sm);
  }

  .chat-message-assistant .chat-content :global(li) {
    margin: 2px 0;
  }

  .chat-message-assistant .chat-content :global(blockquote) {
    border-left: 3px solid var(--color-primary);
    padding-left: var(--spacing-sm);
    color: var(--color-text-secondary);
    margin: var(--spacing-sm) 0;
  }

  .chat-message-assistant .chat-content :global(code.inline-code) {
    background-color: var(--color-border);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  .chat-message-assistant .chat-content :global(.code-block) {
    background-color: #1e1e1e;
    border-radius: var(--border-radius);
    overflow: hidden;
    margin: var(--spacing-sm) 0;
  }

  .chat-message-assistant .chat-content :global(.code-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: #2d2d2d;
    font-size: 12px;
  }

  .chat-message-assistant .chat-content :global(.code-lang) {
    color: #9ca3af;
    font-family: monospace;
  }

  .chat-message-assistant .chat-content :global(.code-block pre) {
    padding: var(--spacing-sm) var(--spacing-md);
    overflow-x: auto;
    margin: 0;
  }

  .chat-message-assistant .chat-content :global(.code-block code) {
    color: #d4d4d4;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    line-height: 1.6;
  }

  /* Syntax highlight classes */
  .chat-message-assistant .chat-content :global(.hl-keyword) { color: #569cd6; font-weight: 500; }
  .chat-message-assistant .chat-content :global(.hl-string) { color: #ce9178; }
  .chat-message-assistant .chat-content :global(.hl-comment) { color: #6a9955; font-style: italic; }
  .chat-message-assistant .chat-content :global(.hl-number) { color: #b5cea8; }
  .chat-message-assistant .chat-content :global(.hl-function) { color: #dcdcaa; }

  /* Typing indicator */
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 4px 0;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    background-color: var(--color-text-secondary);
    border-radius: 50%;
    animation: typing-bounce 1.4s infinite ease-in-out both;
  }

  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes typing-bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  /* Footer */
  .chat-message-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-xs);
  }

  .chat-timestamp {
    font-size: 11px;
    color: var(--color-text-secondary);
    opacity: 0.7;
  }

  .chat-message-user .chat-timestamp {
    color: rgba(255, 255, 255, 0.8);
  }

  .copy-btn {
    font-size: 11px;
    padding: 2px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .copy-btn:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .copy-btn.copied {
    background-color: var(--color-success);
    border-color: var(--color-success);
    color: white;
  }

  /* Code block copy button from markdown renderer */
  .chat-message-assistant .chat-content :global(.copy-btn) {
    font-size: 11px;
    padding: 2px 8px;
    border: 1px solid #555;
    border-radius: 4px;
    background-color: transparent;
    color: #9ca3af;
    cursor: pointer;
    font-family: inherit;
  }

  .chat-message-assistant .chat-content :global(.copy-btn:hover) {
    background-color: #3d3d3d;
    color: white;
  }
</style>
