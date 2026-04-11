/**
 * Chat message list component.
 *
 * Responsibilities:
 * - Render list of chat messages (user and assistant)
 * - Support markdown rendering for assistant responses
 * - Auto-scroll to latest message
 * - Handle streaming token display for in-progress responses
 * - Copy buttons on messages and code blocks
 * - Relative timestamps with periodic updates
 */

import type { ChatMessage } from '../types';
import { renderMarkdown } from './markdown';
import { highlightCode } from './highlight';

/** Reference to the chat container element */
let chatContainer: HTMLElement | null = null;

/** Reference to the messages container */
let messagesContainer: HTMLElement | null = null;

/** Timestamp update interval reference */
let timestampInterval: ReturnType<typeof setInterval> | null = null;

/** Copy button state - track which message was recently copied */
const recentlyCopied = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Create and mount the chat container.
 */
export function createChatContainer(parent: HTMLElement): HTMLElement {
  // Create chat container
  chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';

  // Create messages area (scrollable)
  messagesContainer = document.createElement('div');
  messagesContainer.className = 'chat-messages';
  messagesContainer.id = 'chat-messages';

  chatContainer.appendChild(messagesContainer);
  parent.appendChild(chatContainer);

  // Start timestamp updates
  startTimestampUpdates();

  return messagesContainer;
}

/**
 * Get the messages container.
 */
export function getMessagesContainer(): HTMLElement | null {
  return messagesContainer;
}

/**
 * Destroy the chat container and cleanup.
 */
export function destroyChatContainer(): void {
  stopTimestampUpdates();
  chatContainer = null;
  messagesContainer = null;
}

/**
 * Render the chat message list into a container element.
 */
export function renderChatMessages(
  container: HTMLElement,
  messages: ChatMessage[]
): void {
  // Clear existing messages
  container.innerHTML = '';

  // Render each message
  messages.forEach(message => {
    appendMessage(container, message);
  });

  // Scroll to bottom
  scrollToBottom(container);
}

/**
 * Append a new message to the chat display.
 */
export function appendMessage(
  container: HTMLElement,
  message: ChatMessage
): HTMLElement {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message chat-message-${message.role}`;
  messageDiv.id = `message-${message.id}`;
  messageDiv.setAttribute('data-timestamp', message.timestamp);

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'chat-bubble';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'chat-content';
  contentDiv.id = `content-${message.id}`;

  if (message.streaming) {
    // Show typing indicator for streaming messages
    contentDiv.innerHTML = createTypingIndicator();
  } else {
    // Show the message content with appropriate rendering
    if (message.role === 'assistant') {
      // Render markdown for assistant messages
      contentDiv.innerHTML = renderMarkdown(message.content);
      // Apply syntax highlighting to code blocks
      applySyntaxHighlighting(contentDiv);
    } else {
      // Plain text for user messages (with basic escaping)
      contentDiv.textContent = message.content;
    }
  }

  // Add copy button for the message
  const copyButton = createCopyButton(message.id, message.content, 'message');
  bubbleDiv.appendChild(contentDiv);
  
  // Footer with timestamp and copy button
  const footerDiv = document.createElement('div');
  footerDiv.className = 'chat-message-footer';
  
  const timestampDiv = document.createElement('div');
  timestampDiv.className = 'chat-timestamp';
  timestampDiv.textContent = formatTimestamp(message.timestamp);
  
  footerDiv.appendChild(timestampDiv);
  
  // Only show copy button when not streaming
  if (!message.streaming) {
    footerDiv.appendChild(copyButton);
  }
  
  bubbleDiv.appendChild(footerDiv);
  messageDiv.appendChild(bubbleDiv);
  container.appendChild(messageDiv);

  // Setup copy buttons for code blocks
  setupCodeBlockCopyButtons(contentDiv);

  // Scroll to bottom after appending
  scrollToBottom(container);

  return messageDiv;
}

/**
 * Create a copy button for a message or code block.
 */
function createCopyButton(id: string, content: string, type: 'message' | 'code'): HTMLElement {
  const button = document.createElement('button');
  button.className = 'copy-btn';
  button.setAttribute('data-copy-id', id);
  button.setAttribute('data-copy-type', type);
  button.textContent = 'Copy';
  button.title = type === 'message' ? 'Copy message' : 'Copy code';
  
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    await copyToClipboard(content, button);
  });
  
  return button;
}

/**
 * Copy text to clipboard and show feedback.
 */
async function copyToClipboard(text: string, button: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    
    // Clear any existing timeout for this button
    const buttonId = button.getAttribute('data-copy-id');
    if (buttonId && recentlyCopied.has(buttonId)) {
      clearTimeout(recentlyCopied.get(buttonId));
    }
    
    // Show "Copied!" feedback
    button.textContent = 'Copied!';
    button.classList.add('copied');
    
    // Reset after 2 seconds
    const timeout = setTimeout(() => {
      button.textContent = 'Copy';
      button.classList.remove('copied');
      recentlyCopied.delete(buttonId || '');
    }, 2000);
    
    if (buttonId) {
      recentlyCopied.set(buttonId, timeout);
    }
  } catch (err) {
    console.error('[weblm] Failed to copy:', err);
    button.textContent = 'Failed';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  }
}

/**
 * Apply syntax highlighting to code blocks in a container.
 */
function applySyntaxHighlighting(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll('pre code');
  
  codeBlocks.forEach((block) => {
    const codeElement = block as HTMLElement;
    const langClass = Array.from(codeElement.classList).find(c => c.startsWith('language-'));
    const lang = langClass ? langClass.replace('language-', '') : 'text';
    
    // Apply highlighting
    const highlighted = highlightCode(codeElement.textContent || '', lang);
    codeElement.innerHTML = highlighted;
  });
}

/**
 * Setup copy buttons for code blocks generated by markdown renderer.
 */
function setupCodeBlockCopyButtons(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll('.code-block');
  
  codeBlocks.forEach((block, index) => {
    const codeElement = block.querySelector('code');
    const existingButton = block.querySelector('.copy-btn');
    
    // Skip if button already exists
    if (existingButton) return;
    
    if (codeElement) {
      const code = codeElement.textContent || '';
      // The markdown renderer already creates the button, but we need to wire it up
      const headerButton = block.querySelector('.copy-btn') as HTMLButtonElement;
      if (headerButton) {
        headerButton.addEventListener('click', async (e) => {
          e.stopPropagation();
          await copyToClipboard(code, headerButton);
        });
      }
    }
  });
}

/**
 * Update the content of the last message (for streaming).
 */
export function updateLastMessage(
  container: HTMLElement,
  content: string
): void {
  const messages = container.querySelectorAll('.chat-message');
  if (messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return;
  
  const contentDiv = lastMessage.querySelector('.chat-content') as HTMLElement | null;
  
  if (contentDiv) {
    // Update with plain text during streaming
    contentDiv.textContent = content;
  }

  // Scroll to bottom during streaming
  scrollToBottom(container);
}

/**
 * Append a token to the last message (for streaming).
 */
export function appendToLastMessage(
  container: HTMLElement,
  token: string
): void {
  const messages = container.querySelectorAll('.chat-message');
  if (messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return;
  
  const contentDiv = lastMessage.querySelector('.chat-content') as HTMLElement | null;
  if (!contentDiv) return;

  // Check if it's currently showing typing indicator
  const typingIndicator = contentDiv.querySelector('.typing-indicator');
  if (typingIndicator) {
    // Replace typing indicator with actual content
    contentDiv.textContent = token;
  } else {
    // Append token to existing content
    contentDiv.textContent += token;
  }

  // Scroll to bottom during streaming
  scrollToBottom(container);
}

/**
 * Mark streaming as complete on the last message.
 */
export function finishLastMessage(
  container: HTMLElement,
  message: ChatMessage
): void {
  const messages = container.querySelectorAll('.chat-message');
  if (messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return;
  
  const contentDiv = lastMessage.querySelector('.chat-content');
  const footerDiv = lastMessage.querySelector('.chat-message-footer');

  if (contentDiv) {
    // Render with markdown for assistant messages
    if (message.role === 'assistant') {
      contentDiv.innerHTML = renderMarkdown(message.content);
      applySyntaxHighlighting(contentDiv as HTMLElement);
      setupCodeBlockCopyButtons(contentDiv as HTMLElement);
    } else {
      contentDiv.textContent = message.content;
    }
  }

  // Add copy button after streaming finishes
  if (footerDiv && !footerDiv.querySelector('.copy-btn')) {
    const copyButton = createCopyButton(message.id, message.content, 'message');
    footerDiv.appendChild(copyButton);
  }

  // Update timestamp
  const timestampDiv = lastMessage.querySelector('.chat-timestamp');
  if (timestampDiv) {
    timestampDiv.textContent = formatTimestamp(message.timestamp);
  }
  
  // Store timestamp for updates
  lastMessage.setAttribute('data-timestamp', message.timestamp);

  // Remove streaming class if any
  lastMessage.classList.remove('streaming');
}

/**
 * Start periodic timestamp updates.
 */
export function startTimestampUpdates(): void {
  if (timestampInterval) {
    clearInterval(timestampInterval);
  }
  
  // Update timestamps every 30 seconds
  timestampInterval = setInterval(() => {
    updateAllTimestamps();
  }, 30000);
}

/**
 * Stop periodic timestamp updates.
 */
export function stopTimestampUpdates(): void {
  if (timestampInterval) {
    clearInterval(timestampInterval);
    timestampInterval = null;
  }
}

/**
 * Update all message timestamps.
 */
function updateAllTimestamps(): void {
  if (!messagesContainer) return;
  
  const messages = messagesContainer.querySelectorAll('.chat-message');
  messages.forEach((message) => {
    const timestamp = message.getAttribute('data-timestamp');
    const timestampDiv = message.querySelector('.chat-timestamp');
    
    if (timestamp && timestampDiv) {
      timestampDiv.textContent = formatTimestamp(timestamp);
    }
  });
}

/**
 * Scroll the chat container to show the latest message.
 */
export function scrollToBottom(container: HTMLElement): void {
  // Only auto-scroll if user is near the bottom
  const threshold = 100; // pixels from bottom
  const isNearBottom = 
    container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

  if (isNearBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Clear all messages from the chat.
 */
export function clearChat(container: HTMLElement): void {
  container.innerHTML = '';
}

/**
 * Show a typing indicator in the chat.
 */
export function showTypingIndicator(container: HTMLElement, id: string): void {
  const message: ChatMessage = {
    id,
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
    streaming: true,
  };
  appendMessage(container, message);
}

/**
 * Remove typing indicator.
 */
export function hideTypingIndicator(container: HTMLElement): void {
  const messages = container.querySelectorAll('.chat-message');
  if (messages.length === 0) return;
  
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return;
  
  const typingIndicator = lastMessage.querySelector('.typing-indicator');
  if (typingIndicator) {
    lastMessage.remove();
  }
}

/**
 * Create typing indicator HTML.
 */
function createTypingIndicator(): string {
  return `
    <div class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}

/**
 * Format timestamp for display (relative time).
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}