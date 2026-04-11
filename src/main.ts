/**
 * WebLM — Local-first AI chat powered by Gemma 4 via WebLLM.
 *
 * Entry point. Initializes the UI and engine subsystems.
 */

import { checkWebGPUSupport, WEBGPU_BROWSER_RECOMMENDATIONS } from './engine/webgpu-check';
import { initializeEngine, sendMessage, stopGeneration, getIsGenerating, deleteCachedModel, getCurrentModel, unloadEngine } from './engine/index';
import { categorizeError, trackError, getErrorMessage, getRecoveryAction, getMemoryWarning, clearErrorHistory } from './engine/error-recovery';
import { checkModelCached, getStorageEstimate, getStorageStatus } from './storage/index';
import { loadChatMessages, saveChatMessages, clearChatMessages } from './storage/idb';
import { injectGlobalStyles, lightTheme, darkTheme, applyThemeByName, watchSystemTheme } from './ui/styles';
import { createStatusIndicator, setWebGPUStatus, setOnlineStatus, setModelStatus, setOfflineReadyStatus } from './ui/status';
import { createProgressBar, updateProgress, hideProgressBar, showProgressError } from './ui/progress';
import { createChatContainer, appendMessage, appendToLastMessage, finishLastMessage, scrollToBottom, clearChat, destroyChatContainer } from './ui/chat';
import { createMessageInput, setInputDisabled, clearInput, focusInput } from './ui/input';
import { createUploadUI, type UploadedFile } from './ui/upload';
import { createSettingsButton, showSettingsPanel, hideSettingsPanel, refreshSettingsPanel, setExportCallback } from './ui/settings';
import { registerServiceWorker, setupOfflineDetection, onOfflineStatusChange } from './sw';
import { loadSettings, getTemperature, getMaxTokens, getTopP, getSystemPrompt, getEffectiveTheme, getShowMetrics, setShowMetrics } from './settings';
import { startGeneration, recordFirstToken, incrementTokenCount, completeGeneration, createMetricsElement, isMetricsEnabled, loadMetricsPreference } from './ui/metrics';
import { MODEL_INFO, DEFAULT_MODEL, type ModelVariant } from './config';
import type { ProgressCallback } from './engine/types';
import type { ChatMessage } from './types';
import { generateId } from './types';

// Application state
let currentModelVariant: ModelVariant = DEFAULT_MODEL;
let isLoading = false;
let isGenerating = false;
let messages: ChatMessage[] = [];
let uploadedFile: UploadedFile | null = null;

// UI element references
let appContainer: HTMLElement | null = null;
let statusBar: HTMLElement | null = null;
let mainContent: HTMLElement | null = null;
let chatMessagesContainer: HTMLElement | null = null;
let uploadUI: ReturnType<typeof createUploadUI> | null = null;

/**
 * Create the model selection UI.
 */
function createModelSelectorUI(cachedModels: Set<ModelVariant>): HTMLElement {
  const container = document.createElement('div');
  container.id = 'model-selector-container';
  container.innerHTML = '<h3 style="margin-bottom: var(--spacing-md);">Select a Model</h3>';

  (['small', 'large'] as ModelVariant[]).forEach(model => {
    const info = MODEL_INFO[model];
    const isCached = cachedModels.has(model);

    const optionDiv = document.createElement('div');
    optionDiv.className = 'model-option';
    optionDiv.setAttribute('data-model', model);

    optionDiv.innerHTML = `
      <span class="model-option-name">${info.name}</span>
      <span class="model-option-info">${info.size}</span>
      ${isCached ? '<span class="model-option-status">✓ Cached locally</span>' : ''}
    `;

    optionDiv.addEventListener('click', () => {
      container.querySelectorAll('.model-option').forEach(el => {
        el.classList.remove('selected');
      });
      optionDiv.classList.add('selected');
      currentModelVariant = model;
    });

    container.appendChild(optionDiv);
  });

  // Pre-select default or cached
  if (cachedModels.has('small')) {
    const smallOption = container.querySelector('[data-model="small"]');
    smallOption?.classList.add('selected');
    currentModelVariant = 'small';
  } else {
    const defaultOption = container.querySelector(`[data-model="${DEFAULT_MODEL}"]`);
    defaultOption?.classList.add('selected');
  }

  return container;
}

/**
 * Create action buttons (download/load).
 */
function createLoadButtons(): { container: HTMLElement; setButtonsState: (enabled: boolean, text: string) => void } {
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);';

  const loadButton = document.createElement('button');
  loadButton.className = 'button';
  loadButton.id = 'load-button';
  loadButton.textContent = 'Load Model';

  const clearButton = document.createElement('button');
  clearButton.className = 'button button-secondary';
  clearButton.id = 'clear-button';
  clearButton.textContent = 'Clear Cache';
  clearButton.style.display = 'none';

  container.appendChild(loadButton);
  container.appendChild(clearButton);

  return {
    container,
    setButtonsState: (enabled: boolean, text: string) => {
      loadButton.disabled = !enabled;
      loadButton.textContent = text;
      clearButton.style.display = enabled ? 'none' : 'inline-block';
    }
  };
}

/**
 * Switch to chat UI after model loads.
 */
async function showChatUI(): Promise<void> {
  if (!mainContent || !statusBar || !appContainer) return;

  // Clear the main content
  mainContent.innerHTML = '';
  mainContent.className = 'chat-page';

  // Re-create status bar (it was in mainContent, need to move it)
  const newStatusBar = document.createElement('div');
  newStatusBar.className = 'status-bar';
  appContainer.insertBefore(newStatusBar, mainContent);

  // Recreate status indicator in new status bar
  const statusSection = document.createElement('div');
  statusSection.className = 'status-bar-content';
  statusSection.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';
  
  createStatusIndicator(statusSection);
  
  // Add New Chat and settings buttons
  const settingsContainer = document.createElement('div');
  settingsContainer.style.cssText = 'display: flex; align-items: center; gap: var(--spacing-md);';
  
  // Add New Chat button
  const newChatBtn = document.createElement('button');
  newChatBtn.className = 'new-chat-btn';
  newChatBtn.innerHTML = `<span>+</span> New Chat`;
  newChatBtn.title = 'Start a new conversation';
  newChatBtn.addEventListener('click', handleNewChat);
  settingsContainer.appendChild(newChatBtn);
  
  createSettingsButton(settingsContainer);
  statusSection.appendChild(settingsContainer);
  
  newStatusBar.appendChild(statusSection);

  setWebGPUStatus(true);
  setModelStatus(MODEL_INFO[currentModelVariant].name, false);

  // Create chat container
  chatMessagesContainer = createChatContainer(mainContent);

  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'input-container-wrapper';
  mainContent.appendChild(inputContainer);

  // Create input UI
  createMessageInput(inputContainer, handleSendMessage, handleStopGeneration);

  // Create upload UI
  uploadUI = createUploadUI(
    chatMessagesContainer,
    inputContainer,
    handleFileLoaded,
    handleFileClear
  );

  // Focus input
  focusInput();

  // Set up online/offline listeners
  window.addEventListener('online', () => setOnlineStatus(true));
  window.addEventListener('offline', () => setOnlineStatus(false));
  setOnlineStatus(navigator.onLine);

  // Handle model switch event
  window.addEventListener('model-switch', async (e: Event) => {
    const customEvent = e as CustomEvent<{ model: ModelVariant }>;
    const model = customEvent.detail.model;
    await handleModelSwitch(model);
  });

  // Set up export callback for settings panel
  setExportCallback((format) => {
    if (format === 'txt') {
      exportChatAsText();
    } else {
      exportChatAsMarkdown();
    }
  });

  // Load chat history from IndexedDB
  await loadChatHistory();

  console.log('[weblm] chat UI ready');
}

/**
 * Load chat history from IndexedDB.
 */
async function loadChatHistory(): Promise<void> {
  if (!chatMessagesContainer) return;

  try {
    const savedMessages = await loadChatMessages();
    
    if (savedMessages && savedMessages.length > 0) {
      messages = savedMessages;
      
      // Render all messages
      messages.forEach(message => {
        appendMessage(chatMessagesContainer!, message);
      });
      
      console.log(`[weblm] loaded ${messages.length} messages from history`);
    }
  } catch (error) {
    console.error('[weblm] failed to load chat history:', error);
    // Continue with empty chat
  }
}

/**
 * Save current messages to IndexedDB.
 */
async function saveChatHistory(): Promise<void> {
  try {
    await saveChatMessages(messages);
    console.log(`[weblm] saved ${messages.length} messages to history`);
  } catch (error) {
    console.error('[weblm] failed to save chat history:', error);
  }
}

/**
 * Clear chat history and IndexedDB.
 */
async function handleNewChat(): Promise<void> {
  if (!chatMessagesContainer) return;

  // Clear in-memory messages
  messages = [];
  
  // Clear IndexedDB
  try {
    await clearChatMessages();
  } catch (error) {
    console.error('[weblm] failed to clear chat history:', error);
  }
  
  // Clear UI
  clearChat(chatMessagesContainer);
  
  console.log('[weblm] chat cleared');
}

/**
 * Export chat history as text.
 */
function exportChatAsText(): void {
  const lines: string[] = [];
  lines.push('=== WebLM Chat Export ===');
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push('');
  
  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
    const timestamp = new Date(msg.timestamp).toLocaleString();
    lines.push(`[${timestamp}] ${role}:`);
    lines.push(msg.content);
    lines.push('');
  });
  
  const content = lines.join('\n');
  downloadFile(content, 'weblm-chat.txt', 'text/plain');
}

/**
 * Export chat history as markdown.
 */
function exportChatAsMarkdown(): void {
  const lines: string[] = [];
  lines.push('# WebLM Chat Export');
  lines.push('');
  lines.push(`*Exported: ${new Date().toLocaleString()}*`);
  lines.push('');
  
  messages.forEach(msg => {
    const role = msg.role === 'user' ? '## User' : msg.role === 'assistant' ? '## Assistant' : '## System';
    const timestamp = new Date(msg.timestamp).toLocaleString();
    lines.push(role);
    lines.push(`*${timestamp}*`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  
  const content = lines.join('\n');
  downloadFile(content, 'weblm-chat.md', 'text/markdown');
}

/**
 * Download a file to the user's computer.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Handle model switch.
 */
async function handleModelSwitch(newModel: ModelVariant): Promise<void> {
  if (getIsGenerating()) {
    alert('Cannot switch model while generating. Please wait for the current response to complete.');
    return;
  }

  const currentModel = getCurrentModel();
  if (currentModel === newModel) {
    return; // Already using this model
  }

  // Clear chat for model switch (including IndexedDB)
  if (chatMessagesContainer) {
    clearChat(chatMessagesContainer);
  }
  messages = [];
  
  // Clear IndexedDB chat history
  try {
    await clearChatMessages();
  } catch (error) {
    console.error('[weblm] failed to clear chat history:', error);
  }

  // Show loading state
  setModelStatus(MODEL_INFO[newModel].name, true);

  // Unload current model
  await unloadEngine();

  // Show progress
  const progressDiv = document.createElement('div');
  progressDiv.id = 'model-switch-progress';
  progressDiv.style.cssText = 'padding: var(--spacing-lg); text-align: center;';
  progressDiv.innerHTML = `<p>Loading ${MODEL_INFO[newModel].name}...</p>`;
  if (chatMessagesContainer) {
    chatMessagesContainer.appendChild(progressDiv);
  }

  // Load new model
  try {
    await initializeEngine(newModel, (progress) => {
      const progressText = progressDiv.querySelector('p');
      if (progressText) {
        progressText.textContent = `${progress.message} (${Math.round(progress.progress)}%)`;
      }
    });

    currentModelVariant = newModel;
    setModelStatus(MODEL_INFO[newModel].name, false);

    // Remove progress indicator
    progressDiv.remove();
  } catch (error) {
    console.error('[weblm] Model switch failed:', error);
    progressDiv.innerHTML = `<p class="error-message">Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`;
    setModelStatus(null, false);
  }
}

/**
 * Handle file loaded.
 */
function handleFileLoaded(file: UploadedFile): void {
  uploadedFile = file;
  uploadUI?.setFileInfo(file);
  console.log(`[weblm] file loaded: ${file.name} (${file.size} bytes)`);
}

/**
 * Handle file clear.
 */
function handleFileClear(): void {
  uploadedFile = null;
  uploadUI?.clearFileInfo();
  console.log('[weblm] file cleared');
}

/**
 * Handle sending a message.
 */
async function handleSendMessage(userMessage: string): Promise<void> {
  if (isGenerating || !chatMessagesContainer) return;

  // Add user message
  const userMsg: ChatMessage = {
    id: generateId(),
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  };
  messages.push(userMsg);
  appendMessage(chatMessagesContainer, userMsg);

  // Disable input
  isGenerating = true;
  setInputDisabled(true);

  // Add assistant placeholder
  const assistantMsg: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
    streaming: true,
  };
  messages.push(assistantMsg);
  appendMessage(chatMessagesContainer, assistantMsg);

  clearInput();

  try {
    // Prepare messages with file context if present
    let messagesWithContext = [...messages.slice(0, -1)]; // All messages except assistant placeholder
    
    // Add system prompt if configured
    const systemPrompt = getSystemPrompt();
    if (systemPrompt && systemPrompt.trim()) {
      const systemMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: systemPrompt.trim(),
        timestamp: new Date().toISOString(),
      };
      messagesWithContext = [systemMessage, ...messagesWithContext];
    }
    
    if (uploadedFile) {
      // Add file content as a system message at the beginning
      const systemMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `The user has uploaded a file named "${uploadedFile.name}". Here is its content:\n\n${uploadedFile.content}`,
        timestamp: new Date().toISOString(),
      };
      messagesWithContext = [systemMessage, ...messagesWithContext];
      
      // Clear file after using it once (user can re-upload if needed)
      handleFileClear();
    }

    // Get generation settings
    const temperature = getTemperature();
    const maxTokens = getMaxTokens();
    const topP = getTopP();

    // Stream the response
    await sendMessage(
      messagesWithContext,
      (token) => {
        // Append token to last message
        assistantMsg.content += token;
        appendToLastMessage(chatMessagesContainer!, token);
      },
      (fullResponse) => {
        // Completion
        assistantMsg.content = fullResponse;
        assistantMsg.streaming = false;
        finishLastMessage(chatMessagesContainer!, assistantMsg);
        isGenerating = false;
        setInputDisabled(false);
        focusInput();
        
        // Save chat history after completion
        saveChatHistory();
      },
      (error) => {
        // Error
        console.error('[weblm] Generation error:', error);
        assistantMsg.content = `Error: ${error.message}`;
        assistantMsg.streaming = false;
        finishLastMessage(chatMessagesContainer!, assistantMsg);
        isGenerating = false;
        setInputDisabled(false);
        focusInput();
        
        // Save even on error
        saveChatHistory();
      },
      { temperature, maxTokens, topP }
    );
  } catch (error) {
    console.error('[weblm] Send message error:', error);
    assistantMsg.content = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    assistantMsg.streaming = false;
    finishLastMessage(chatMessagesContainer!, assistantMsg);
    isGenerating = false;
    setInputDisabled(false);
    focusInput();
    
    // Save even on error
    saveChatHistory();
  }
}

/**
 * Handle stopping generation.
 */
function handleStopGeneration(): void {
  stopGeneration();
  isGenerating = false;
  setInputDisabled(false);

  // Mark the last message as complete
  if (chatMessagesContainer && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streaming) {
      lastMsg.streaming = false;
      finishLastMessage(chatMessagesContainer, lastMsg);
    }
  }
}

/**
 * Handle loading a model.
 */
async function handleLoadModel(
  model: ModelVariant,
  cachedModels: Set<ModelVariant>,
  progressContainer: HTMLElement,
  buttonsState: { setButtonsState: (enabled: boolean, text: string) => void }
): Promise<void> {
  if (isLoading) return;
  isLoading = true;

  const modelInfo = MODEL_INFO[model];

  // Check storage before loading if not cached
  if (!cachedModels.has(model)) {
    const storage = await getStorageEstimate();
    const requiredSpace = modelInfo.vramMB * 1024 * 1024 * 1.5;
    if (storage.available < requiredSpace) {
      alert(`Not enough storage space. Need ${modelInfo.size}, but only ${Math.round(storage.available / 1024 / 1024 / 1024)}GB available.`);
      isLoading = false;
      return;
    }
    buttonsState.setButtonsState(false, 'Downloading...');
  } else {
    buttonsState.setButtonsState(false, 'Loading...');
  }

  setModelStatus(modelInfo.name, true);

  // Create progress bar
  progressContainer.innerHTML = '';
  createProgressBar(progressContainer);

  const onProgress: ProgressCallback = (progress) => {
    updateProgress(progress);
  };

  try {
    await initializeEngine(model, onProgress);
    hideProgressBar();
    setModelStatus(modelInfo.name, false);

    // Show chat UI
    showChatUI();

    console.log(`[weblm] Model ${model} loaded successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[weblm] Model loading failed:', errorMessage);

    setModelStatus(null, false);
    showProgressError(`Failed to load model: ${errorMessage}`, () => {
      hideProgressBar();
      init(); // Restart
    });

    buttonsState.setButtonsState(true, 'Try Again');
    isLoading = false;
  }
}

/**
 * Initialize the WebLM application.
 */
async function init(): Promise<void> {
  console.log('[weblm] starting...');

  // Inject global styles
  injectGlobalStyles();

  // Load saved settings and apply theme
  const settings = loadSettings();
  applyThemeByName(settings.theme);

  // Load metrics preference
  loadMetricsPreference();

  // Watch for system theme changes if using system preference
  if (settings.theme === 'system') {
    watchSystemTheme(() => {
      applyThemeByName('system');
    });
  }

  // Get the app container
  appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('[weblm] App container not found');
    return;
  }

  // Create status bar
  statusBar = document.createElement('div');
  statusBar.className = 'status-bar';
  appContainer.appendChild(statusBar);

  // Create main content
  mainContent = document.createElement('div');
  mainContent.className = 'main-content';
  appContainer.appendChild(mainContent);

  // Create status indicator
  createStatusIndicator(statusBar);

  // Check WebGPU support
  const capabilities = await checkWebGPUSupport();
  setWebGPUStatus(capabilities.isAvailable, capabilities.unavailableReason);

  // If WebGPU is not available, show error and stop
  if (!capabilities.isAvailable) {
    mainContent.innerHTML = `
      <h1 class="title">WebLM — Local AI Chat</h1>
      <div class="error-message">
        <h3>⚠️ WebGPU Not Available</h3>
        <p>${capabilities.unavailableReason || 'WebGPU is required for this application to run.'}</p>
        <p style="margin-top: var(--spacing-sm);">Supported browsers:</p>
        <ul style="margin-left: var(--spacing-md); margin-top: var(--spacing-sm);">
          ${WEBGPU_BROWSER_RECOMMENDATIONS.map(b => `<li>${b}</li>`).join('')}
        </ul>
        <p style="margin-top: var(--spacing-sm);">If you're using a supported browser, ensure hardware acceleration is enabled.</p>
      </div>
    `;
    return;
  }

  // Show title
  const title = document.createElement('h1');
  title.className = 'title';
  title.textContent = 'WebLM — Local AI Chat';
  mainContent.appendChild(title);

  const description = document.createElement('p');
  description.className = 'description';
  description.textContent = 'A fully local, privacy-first AI chat running entirely in your browser.';
  mainContent.appendChild(description);

  // Show storage status
  createStorageStatus(mainContent);

  // Check which models are cached
  const cachedModels = new Set<ModelVariant>();
  const smallCached = await checkModelCached('small');
  const largeCached = await checkModelCached('large');
  if (smallCached) cachedModels.add('small');
  if (largeCached) cachedModels.add('large');

  // Create model selector
  const modelSelector = createModelSelectorUI(cachedModels);
  mainContent.appendChild(modelSelector);

  // Create progress container (hidden initially)
  const progressContainer = document.createElement('div');
  progressContainer.id = 'progress-wrapper';
  mainContent.appendChild(progressContainer);

  // Create load buttons
  const { container: buttonsContainer, setButtonsState } = createLoadButtons();
  mainContent.appendChild(buttonsContainer);

  // Update button text based on cache status
  if (cachedModels.has(currentModelVariant)) {
    setButtonsState(true, 'Load');
  } else {
    setButtonsState(true, 'Download');
  }

  // Set up load button click handler
  const loadButton = document.getElementById('load-button');
  const clearButton = document.getElementById('clear-button');

  loadButton?.addEventListener('click', () => {
    handleLoadModel(currentModelVariant, cachedModels, progressContainer, { setButtonsState });
  });

  clearButton?.addEventListener('click', async () => {
    if (confirm(`Clear cache for ${MODEL_INFO[currentModelVariant].name}? You'll need to download it again next time.`)) {
      await deleteCachedModel(currentModelVariant);
      location.reload();
    }
  });

  // Set up online/offline status listeners
  window.addEventListener('online', () => setOnlineStatus(true));
  window.addEventListener('offline', () => setOnlineStatus(false));
  setOnlineStatus(navigator.onLine);

  // Register service worker for offline capability
  registerServiceWorker().then(() => {
    // Set up offline detection and update status
    setupOfflineDetection();
    onOfflineStatusChange((isOffline, isReady) => {
      setOnlineStatus(!isOffline);
      if (isReady) {
        setOfflineReadyStatus(true);
      }
    });
  });

  console.log('[weblm] initialization complete');
}

/**
 * Create storage status element.
 */
function createStorageStatus(container: HTMLElement): void {
  const statusDiv = document.createElement('p');
  statusDiv.style.cssText = 'color: var(--color-text-secondary); margin-top: var(--spacing-sm); font-size: var(--font-size-sm);';
  container.appendChild(statusDiv);

  getStorageStatus().then(status => {
    statusDiv.textContent = status;
  });
}

// Start the application
init().catch(error => {
  console.error('[weblm] initialization failed:', error);
});