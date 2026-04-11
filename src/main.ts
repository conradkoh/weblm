/**
 * WebLM — Local-first AI chat powered by Gemma via WebLLM.
 *
 * Entry point. Initializes the UI and engine subsystems.
 */

import { checkWebGPUSupport, WEBGPU_BROWSER_RECOMMENDATIONS } from './engine/webgpu-check';
import { initializeEngine, sendMessage, stopGeneration, getIsGenerating, deleteCachedModel, getCurrentModel, unloadEngine } from './engine/index';
import { categorizeError, trackError, getErrorMessage, getRecoveryAction, getMemoryWarning, clearErrorHistory } from './engine/error-recovery';
import { checkModelCached, getStorageEstimate, getStorageStatus } from './storage/index';
import { loadChatMessages, saveChatMessages, clearChatMessages } from './storage/idb';
import { injectGlobalStyles, lightTheme, darkTheme, applyThemeByName, watchSystemTheme } from './ui/styles';
import { logger } from './logger';
import { createStatusIndicator, setWebGPUStatus, setOnlineStatus, setModelStatus, setOfflineReadyStatus } from './ui/status';
import { createProgressBar, updateProgress, hideProgressBar, showProgressError } from './ui/progress';
import { createChatContainer, appendMessage, appendToLastMessage, finishLastMessage, scrollToBottom, clearChat, destroyChatContainer } from './ui/chat';
import { createMessageInput, setInputDisabled, clearInput, focusInput } from './ui/input';
import { createUploadUI, type UploadedFile } from './ui/upload';
import { createSettingsButton, showSettingsPanel, hideSettingsPanel, refreshSettingsPanel, setExportCallback } from './ui/settings';
import { registerServiceWorker, setupOfflineDetection, onOfflineStatusChange } from './sw';
import { loadSettings, getTemperature, getMaxTokens, getTopP, getSystemPrompt, getEffectiveTheme, getShowMetrics, setShowMetrics } from './settings';
import { startGeneration, recordFirstToken, incrementTokenCount, completeGeneration, createMetricsElement, isMetricsEnabled, loadMetricsPreference } from './ui/metrics';
import { getModelInfo, DEFAULT_MODEL_ID, getModelCatalog } from './config';
import type { ProgressCallback } from './engine/types';
import type { ChatMessage } from './types';
import { generateId } from './types';
import { createModelSelectorUI, createLoadButtons } from './ui/model-selector';
import { exportChatAsText, exportChatAsMarkdown } from './app/export';
import { createChatPage, renderMessages } from './ui/chat-page';
import { createFileHandlers } from './app/file-handler';

// Application state
let currentModelId: string = DEFAULT_MODEL_ID;
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
 * Switch to chat UI after model loads.
 */
async function showChatUI(): Promise<void> {
  if (!mainContent || !appContainer) return;

  // Create file handlers
  const fileHandlers = createFileHandlers(
    {
      getUploadedFile: () => uploadedFile,
      setUploadedFile: (file) => { uploadedFile = file; },
    },
    null // Will be updated after uploadUI is created
  );

  // Create chat page using extracted module
  const elements = createChatPage(
    mainContent,
    appContainer,
    currentModelId,
    {
      onNewChat: handleNewChat,
      onSendMessage: handleSendMessage,
      onStopGeneration: handleStopGeneration,
      onModelSwitch: handleModelSwitch,
      onFileLoaded: (file) => { uploadedFile = file; uploadUI?.setFileInfo(file); },
      onFileClear: () => { uploadedFile = null; uploadUI?.clearFileInfo(); },
      onExportText: () => exportChatAsText(messages),
      onExportMarkdown: () => exportChatAsMarkdown(messages),
    },
    () => uploadedFile
  );

  // Update references
  chatMessagesContainer = elements.chatMessagesContainer;
  uploadUI = elements.uploadUI;

  // Focus input
  focusInput();

  // Load chat history from IndexedDB
  await loadChatHistory();

  logger.info('chat UI ready');
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
      
      logger.debug(`loaded ${messages.length} messages from history`);
    }
  } catch (error) {
    logger.error('failed to load chat history:', error);
    // Continue with empty chat
  }
}

/**
 * Save current messages to IndexedDB.
 */
async function saveChatHistory(): Promise<void> {
  try {
    await saveChatMessages(messages);
    logger.debug(`saved ${messages.length} messages to history`);
  } catch (error) {
    logger.error('failed to save chat history:', error);
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
    logger.error('failed to clear chat history:', error);
  }
  
  // Clear UI
  clearChat(chatMessagesContainer);
  
  logger.info('chat cleared');
}

/**
 * Handle model switch.
 */
async function handleModelSwitch(newModelId: string): Promise<void> {
  if (getIsGenerating()) {
    alert('Cannot switch model while generating. Please wait for the current response to complete.');
    return;
  }

  const currentModel = getCurrentModel();
  if (currentModel === newModelId) {
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
    logger.error('failed to clear chat history:', error);
  }

  const newModelInfo = getModelInfo(newModelId);
  const displayName = newModelInfo?.displayName ?? newModelId;

  // Show loading state
  setModelStatus(displayName, true);

  // Unload current model
  await unloadEngine();

  // Show progress
  const progressDiv = document.createElement('div');
  progressDiv.id = 'model-switch-progress';
  progressDiv.style.cssText = 'padding: var(--spacing-lg); text-align: center;';
  progressDiv.innerHTML = `<p>Loading ${displayName}...</p>`;
  if (chatMessagesContainer) {
    chatMessagesContainer.appendChild(progressDiv);
  }

  // Load new model
  try {
    await initializeEngine(newModelId, (progress) => {
      const progressText = progressDiv.querySelector('p');
      if (progressText) {
        progressText.textContent = `${progress.message} (${Math.round(progress.progress)}%)`;
      }
    });

    currentModelId = newModelId;
    setModelStatus(displayName, false);

    // Remove progress indicator
    progressDiv.remove();
  } catch (error) {
    logger.error('Model switch failed:', error);
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
  logger.debug(`file loaded: ${file.name} (${file.size} bytes)`);
}

/**
 * Handle file clear.
 */
function handleFileClear(): void {
  uploadedFile = null;
  uploadUI?.clearFileInfo();
  logger.debug('file cleared');
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
        logger.error('Generation error:', error);
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
    logger.error('Send message error:', error);
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
  modelId: string,
  cachedModels: Set<string>,
  progressContainer: HTMLElement,
  buttonsState: { setButtonsState: (enabled: boolean, text: string) => void }
): Promise<void> {
  if (isLoading) return;
  isLoading = true;

  const modelInfo = getModelInfo(modelId);
  const displayName = modelInfo?.displayName ?? modelId;

  // Check storage before loading if not cached
  if (!cachedModels.has(modelId)) {
    const storage = await getStorageEstimate();
    const requiredSpace = (modelInfo?.vramMB ?? 0) * 1024 * 1024 * 1.5;
    if (requiredSpace > 0 && storage.available < requiredSpace) {
      const sizeStr = modelInfo?.sizeGB ? `${modelInfo.sizeGB} GB` : 'the model';
      alert(`Not enough storage space. Need ~${sizeStr}, but only ${Math.round(storage.available / 1024 / 1024 / 1024)}GB available.`);
      isLoading = false;
      return;
    }
    buttonsState.setButtonsState(false, 'Downloading...');
  } else {
    buttonsState.setButtonsState(false, 'Loading...');
  }

  setModelStatus(displayName, true);

  // Create progress bar
  progressContainer.innerHTML = '';
  createProgressBar(progressContainer);

  const onProgress: ProgressCallback = (progress) => {
    updateProgress(progress);
  };

  try {
    await initializeEngine(modelId, onProgress);
    hideProgressBar();
    setModelStatus(displayName, false);

    // Show chat UI
    showChatUI();

    logger.info(`Model ${modelId} loaded successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Model loading failed:', errorMessage);

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
  logger.info('starting...');

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
    logger.error('App container not found');
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

  // Show launcher screen
  mainContent.className = 'launcher-screen';

  const launcherCard = document.createElement('div');
  launcherCard.className = 'launcher-card';

  // Hero
  const hero = document.createElement('div');
  hero.className = 'launcher-hero';
  hero.innerHTML = `
    <div class="launcher-logo">🧠</div>
    <h1 class="launcher-title">WebLM</h1>
    <p class="launcher-subtitle">Local AI Chat — Private &amp; Fast</p>
  `;
  launcherCard.appendChild(hero);

  // Storage status (small, unobtrusive)
  const storageDiv = document.createElement('div');
  storageDiv.className = 'launcher-storage';
  launcherCard.appendChild(storageDiv);
  getStorageStatus().then(status => { storageDiv.textContent = status; });

  // Check which models are cached
  const catalog = getModelCatalog();
  const cachedModels = new Set<string>();
  await Promise.all(
    catalog.map(async info => {
      if (await checkModelCached(info.modelId)) cachedModels.add(info.modelId);
    })
  );

  // Create model selector
  const modelSelector = createModelSelectorUI(cachedModels, (modelId) => {
    currentModelId = modelId;
    // Update button text when selection changes
    if (cachedModels.has(modelId)) {
      setButtonsState(true, '✓ Cached — Load Instantly');
    } else {
      setButtonsState(true, 'Download & Load');
    }
  });
  launcherCard.appendChild(modelSelector);

  // Create progress container (hidden initially)
  const progressContainer = document.createElement('div');
  progressContainer.id = 'progress-wrapper';
  launcherCard.appendChild(progressContainer);

  // Create load buttons
  const { container: buttonsContainer, setButtonsState } = createLoadButtons();
  launcherCard.appendChild(buttonsContainer);

  mainContent.appendChild(launcherCard);

  // Update button text based on initial cache status
  if (cachedModels.has(currentModelId)) {
    setButtonsState(true, '✓ Cached — Load Instantly');
  } else {
    setButtonsState(true, 'Download & Load');
  }

  // Set up load button click handler
  const loadButton = document.getElementById('load-button');
  const clearButton = document.getElementById('clear-button');

  loadButton?.addEventListener('click', () => {
    handleLoadModel(currentModelId, cachedModels, progressContainer, { setButtonsState });
  });

  clearButton?.addEventListener('click', async () => {
    const info = getModelInfo(currentModelId);
    if (confirm(`Clear cache for ${info?.displayName ?? currentModelId}? You'll need to download it again next time.`)) {
      await deleteCachedModel(currentModelId);
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

  logger.info('initialization complete');
}

// Start the application
init().catch(error => {
  logger.error('initialization failed:', error);
});