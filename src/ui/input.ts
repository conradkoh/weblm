/**
 * Message input component.
 *
 * Responsibilities:
 * - Textarea for user message input
 * - Send button with loading state
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Input validation and sanitization
 * - Disabled state during model inference
 */

/** Reference to input elements */
let textareaElement: HTMLTextAreaElement | null = null;
let sendButtonElement: HTMLButtonElement | null = null;
let stopButtonElement: HTMLButtonElement | null = null;
let inputContainerElement: HTMLElement | null = null;
let onSendCallback: ((message: string) => void) | null = null;
let onStopCallback: (() => void) | null = null;
let isDisabled = false;

/**
 * Create and mount the message input component.
 */
export function createMessageInput(
  container: HTMLElement,
  onSend: (message: string) => void,
  onStop?: () => void
): void {
  onSendCallback = onSend;
  onStopCallback = onStop || null;

  // Create input container
  inputContainerElement = document.createElement('div');
  inputContainerElement.className = 'input-container';
  inputContainerElement.setAttribute('role', 'form');
  inputContainerElement.setAttribute('aria-label', 'Message input form');

  // Create textarea
  textareaElement = document.createElement('textarea');
  textareaElement.className = 'input-textarea';
  textareaElement.placeholder = 'Type a message...';
  textareaElement.rows = 1;
  textareaElement.setAttribute('aria-label', 'Message input');

  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'input-buttons';

  // Create send button
  sendButtonElement = document.createElement('button');
  sendButtonElement.className = 'button';
  sendButtonElement.textContent = 'Send';
  sendButtonElement.disabled = true;
  sendButtonElement.setAttribute('aria-label', 'Send message');

  // Create stop button (hidden by default)
  stopButtonElement = document.createElement('button');
  stopButtonElement.className = 'button button-danger';
  stopButtonElement.textContent = 'Stop';
  stopButtonElement.style.display = 'none';
  stopButtonElement.setAttribute('aria-label', 'Stop generation');

  // Add event listeners
  textareaElement.addEventListener('input', handleInput);
  textareaElement.addEventListener('keydown', handleKeydown);

  sendButtonElement.addEventListener('click', handleSend);
  stopButtonElement.addEventListener('click', handleStop);

  // Assemble
  buttonsContainer.appendChild(sendButtonElement);
  buttonsContainer.appendChild(stopButtonElement);
  inputContainerElement.appendChild(textareaElement);
  inputContainerElement.appendChild(buttonsContainer);
  container.appendChild(inputContainerElement);

  // Focus the textarea
  textareaElement.focus();
}

/**
 * Handle textarea input.
 */
function handleInput(): void {
  if (!textareaElement || !sendButtonElement) return;

  // Auto-grow textarea
  textareaElement.style.height = 'auto';
  textareaElement.style.height = `${Math.min(textareaElement.scrollHeight, 200)}px`;

  // Enable/disable send button based on content
  const hasContent = textareaElement.value.trim().length > 0;
  sendButtonElement.disabled = !hasContent || isDisabled;
}

/**
 * Handle keydown events.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (!textareaElement) return;

  // Enter to send, Shift+Enter for newline
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

/**
 * Handle send button click.
 */
function handleSend(): void {
  if (!textareaElement || !sendButtonElement || isDisabled) return;

  const message = textareaElement.value.trim();
  if (message.length === 0) return;

  // Clear input
  textareaElement.value = '';
  handleInput(); // Reset height and button state

  // Call the callback
  if (onSendCallback) {
    onSendCallback(message);
  }
}

/**
 * Handle stop button click.
 */
function handleStop(): void {
  if (onStopCallback) {
    onStopCallback();
  }
}

/**
 * Set the input disabled state (during inference).
 */
export function setInputDisabled(disabled: boolean): void {
  isDisabled = disabled;

  if (textareaElement) {
    textareaElement.disabled = disabled;
  }

  if (sendButtonElement) {
    sendButtonElement.disabled = disabled || !textareaElement?.value.trim();
  }

  // Show/hide stop button
  if (stopButtonElement) {
    stopButtonElement.style.display = disabled ? 'inline-block' : 'none';
    sendButtonElement!.style.display = disabled ? 'none' : 'inline-block';
  }
}

/**
 * Clear the input field.
 */
export function clearInput(): void {
  if (!textareaElement) return;

  textareaElement.value = '';
  handleInput();
}

/**
 * Focus the input field.
 */
export function focusInput(): void {
  if (textareaElement) {
    textareaElement.focus();
  }
}

/**
 * Get the current input value.
 */
export function getInputValue(): string {
  if (!textareaElement) return '';
  return textareaElement.value.trim();
}

/**
 * Set placeholder text.
 */
export function setPlaceholder(text: string): void {
  if (textareaElement) {
    textareaElement.placeholder = text;
  }
}