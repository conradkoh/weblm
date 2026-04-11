/**
 * Chat message list component.
 *
 * Responsibilities:
 * - Render list of chat messages (user and assistant)
 * - Support markdown rendering for assistant responses
 * - Auto-scroll to latest message
 * - Handle streaming token display for in-progress responses
 */

import type { ChatMessage } from '../types';

/** Reference to the chat container element */
let chatContainer: HTMLElement | null = null;

/** Reference to the messages container */
let messagesContainer: HTMLElement | null = null;

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

  return messagesContainer;
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

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'chat-bubble';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'chat-content';
  contentDiv.id = `content-${message.id}`;

  if (message.streaming) {
    // Show typing indicator for streaming messages
    contentDiv.innerHTML = createTypingIndicator();
  } else {
    // Show the message content
    contentDiv.textContent = message.content;
  }

  const timestampDiv = document.createElement('div');
  timestampDiv.className = 'chat-timestamp';
  timestampDiv.textContent = formatTimestamp(message.timestamp);

  bubbleDiv.appendChild(contentDiv);
  bubbleDiv.appendChild(timestampDiv);
  messageDiv.appendChild(bubbleDiv);
  container.appendChild(messageDiv);

  // Scroll to bottom after appending
  scrollToBottom(container);

  return messageDiv;
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
  
  const contentDiv = lastMessage.querySelector('.chat-content');
  
  if (contentDiv) {
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
  const timestampDiv = lastMessage.querySelector('.chat-timestamp');

  if (contentDiv) {
    contentDiv.textContent = message.content;
  }

  if (timestampDiv) {
    timestampDiv.textContent = formatTimestamp(message.timestamp);
  }

  // Remove streaming class if any
  lastMessage.classList.remove('streaming');
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
 * Format timestamp for display.
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}