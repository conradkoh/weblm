/**
 * Chat page UI construction.
 *
 * Responsibilities:
 * - Build chat page layout
 * - Set up status bar, chat container, input container
 * - Wire up event listeners via callbacks
 */

import { getModelInfo } from '../config';
import { createStatusIndicator, setWebGPUStatus, setModelStatus, setOnlineStatus } from './status';
import { createChatContainer } from './chat';
import { createMessageInput } from './input';
import { createUploadUI, type UploadedFile } from './upload';
import { createSettingsButton } from './settings';
import type { ChatMessage } from '../types';
import { logger } from '../logger';

/**
 * Callbacks needed for chat page interactions.
 */
export interface ChatPageCallbacks {
  onNewChat: () => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
  onStopGeneration: () => void;
  onModelSwitch: (model: string) => Promise<void>;
  onFileLoaded: (file: UploadedFile) => void;
  onFileClear: () => void;
  onExportText: () => void;
  onExportMarkdown: () => void;
}

/**
 * References returned after creating the chat page.
 */
export interface ChatPageElements {
  chatMessagesContainer: HTMLElement;
  uploadUI: ReturnType<typeof createUploadUI>;
}

/**
 * Create the chat page UI.
 * Returns references to created elements and accepts callbacks for wiring events.
 */
export function createChatPage(
  mainContent: HTMLElement,
  appContainer: HTMLElement,
  currentModelId: string,
  callbacks: ChatPageCallbacks,
  getUploadedFile: () => UploadedFile | null
): ChatPageElements {
  // Clear the main content
  mainContent.innerHTML = '';
  mainContent.className = 'chat-page';

  // Re-create status bar
  const newStatusBar = document.createElement('div');
  newStatusBar.className = 'status-bar';
  appContainer.insertBefore(newStatusBar, mainContent);

  // Create status section
  const statusSection = document.createElement('div');
  statusSection.className = 'status-bar-content';
  statusSection.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';

  createStatusIndicator(statusSection);

  // Add New Chat and settings buttons
  const settingsContainer = document.createElement('div');
  settingsContainer.style.cssText = 'display: flex; align-items: center; gap: var(--spacing-md);';

  const newChatBtn = document.createElement('button');
  newChatBtn.className = 'new-chat-btn';
  newChatBtn.innerHTML = `<span>+</span> New Chat`;
  newChatBtn.title = 'Start a new conversation';
  newChatBtn.addEventListener('click', callbacks.onNewChat);
  settingsContainer.appendChild(newChatBtn);

  createSettingsButton(settingsContainer);
  statusSection.appendChild(settingsContainer);

  newStatusBar.appendChild(statusSection);

  setWebGPUStatus(true);
  setModelStatus(getModelInfo(currentModelId)?.displayName ?? currentModelId, false);

  // Create chat container
  const chatMessagesContainer = createChatContainer(mainContent);

  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'input-container-wrapper';
  mainContent.appendChild(inputContainer);

  // Create input UI
  createMessageInput(inputContainer, callbacks.onSendMessage, callbacks.onStopGeneration);

  // Create upload UI
  const uploadUI = createUploadUI(
    chatMessagesContainer,
    inputContainer,
    callbacks.onFileLoaded,
    callbacks.onFileClear
  );

  // Set up online/offline listeners
  window.addEventListener('online', () => setOnlineStatus(true));
  window.addEventListener('offline', () => setOnlineStatus(false));
  setOnlineStatus(navigator.onLine);

  // Handle model switch event
  window.addEventListener('model-switch', ((e: Event) => {
    const customEvent = e as CustomEvent<{ model: string }>;
    callbacks.onModelSwitch(customEvent.detail.model);
  }) as EventListener);

  logger.info('chat UI ready');

  return {
    chatMessagesContainer,
    uploadUI,
  };
}

/**
 * Render messages into the chat container.
 */
export function renderMessages(
  container: HTMLElement,
  messages: ChatMessage[],
  appendMessageFn: (container: HTMLElement, message: ChatMessage) => void
): void {
  messages.forEach(message => {
    appendMessageFn(container, message);
  });
}