/**
 * Chat component CSS styles.
 */

export const chatStyles = `
    /* Chat container */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      overflow: hidden;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    /* Chat message bubbles */
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
      white-space: pre-wrap;
    }

    .chat-message-user .chat-bubble {
      background-color: var(--color-primary);
      color: white;
      border-bottom-right-radius: 4px;
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

    .chat-timestamp {
      font-size: 11px;
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
      opacity: 0.7;
    }

    .chat-message-user .chat-timestamp {
      color: rgba(255, 255, 255, 0.8);
      text-align: right;
    }

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

    .typing-indicator span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes typing-bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

    /* Chat message footer (timestamp + copy) */
    .chat-message-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-xs);
    }

    /* Copy button */
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

    /* Chat header */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-surface);
    }

    .chat-header-title {
      font-weight: 600;
      color: var(--color-text);
    }

    /* Chat page layout */
    .chat-page {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: var(--spacing-md);
    }

    .input-container-wrapper {
      padding: var(--spacing-md);
      background-color: var(--color-surface);
      border-top: 1px solid var(--color-border);
    }
`;