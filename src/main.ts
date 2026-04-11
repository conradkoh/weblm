/**
 * WebLM — Local-first AI chat powered by Gemma 4 via WebLLM.
 *
 * Entry point. Initializes the UI and engine subsystems.
 */

import { checkWebGPUSupport, WEBGPU_BROWSER_RECOMMENDATIONS } from './engine/webgpu-check';
import { initializeEngine, isModelLoaded, getCurrentModel, cancelLoading } from './engine/index';
import { checkModelCached, getStorageEstimate, getStorageStatus } from './storage/index';
import { injectGlobalStyles, lightTheme, applyTheme } from './ui/styles';
import { createStatusIndicator, setWebGPUStatus, setOnlineStatus, setModelStatus, setStatusBadge } from './ui/status';
import { createProgressBar, updateProgress, hideProgressBar, showProgressError } from './ui/progress';
import { MODEL_IDS, MODEL_INFO, DEFAULT_MODEL, type ModelVariant } from './config';
import type { ProgressCallback } from './engine/types';

// Application state
let currentModelVariant: ModelVariant = DEFAULT_MODEL;
let isLoading = false;

/**
 * Create the model selection UI.
 */
function createModelSelector(
  container: HTMLElement,
  onSelect: (model: ModelVariant) => void,
  cachedModels: Set<ModelVariant>
): void {
  const selectorDiv = document.createElement('div');
  selectorDiv.className = 'model-selector';
  selectorDiv.innerHTML = '<h3 style="margin-bottom: var(--spacing-md);">Select a Model</h3>';

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
      // Update selection UI
      selectorDiv.querySelectorAll('.model-option').forEach(el => {
        el.classList.remove('selected');
      });
      optionDiv.classList.add('selected');
      onSelect(model);
    });

    selectorDiv.appendChild(optionDiv);
  });

  container.appendChild(selectorDiv);
}

/**
 * Create action buttons (download/load).
 */
function createActionButtons(
  container: HTMLElement,
  onLoad: (model: ModelVariant) => void,
  onClear: (model: ModelVariant) => void
): { setButtonsState: (enabled: boolean, text: string) => void } {
  const buttonsDiv = document.createElement('div');
  buttonsDiv.style.cssText = 'display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);';

  // Load/Download button
  const loadButton = document.createElement('button');
  loadButton.className = 'button';
  loadButton.id = 'load-button';
  loadButton.textContent = 'Load Model';
  loadButton.addEventListener('click', () => {
    const selected = container.querySelector('.model-option.selected');
    if (selected) {
      const model = selected.getAttribute('data-model') as ModelVariant;
      onLoad(model);
    }
  });

  // Clear cache button (secondary)
  const clearButton = document.createElement('button');
  clearButton.className = 'button button-secondary';
  clearButton.id = 'clear-button';
  clearButton.textContent = 'Clear Cache';
  clearButton.style.display = 'none';
  clearButton.addEventListener('click', () => {
    const selected = container.querySelector('.model-option.selected');
    if (selected) {
      const model = selected.getAttribute('data-model') as ModelVariant;
      onClear(model);
    }
  });

  buttonsDiv.appendChild(loadButton);
  buttonsDiv.appendChild(clearButton);
  container.appendChild(buttonsDiv);

  return {
    setButtonsState: (enabled: boolean, text: string) => {
      loadButton.disabled = !enabled;
      loadButton.textContent = text;
      clearButton.style.display = enabled ? 'none' : 'inline-block';
    }
  };
}

/**
 * Show the storage status.
 */
function createStorageStatus(container: HTMLElement): void {
  const statusDiv = document.createElement('p');
  statusDiv.id = 'storage-status';
  statusDiv.style.cssText = 'color: var(--color-text-secondary); margin-top: var(--spacing-sm); font-size: var(--font-size-sm);';
  container.appendChild(statusDiv);

  // Update storage status asynchronously
  getStorageStatus().then(status => {
    statusDiv.textContent = status;
  });
}

/**
 * Initialize the WebLM application.
 */
async function init(): Promise<void> {
  console.log('[weblm] starting...');

  // Inject global styles
  injectGlobalStyles();

  // Apply default theme
  applyTheme(lightTheme);

  // Get the app container
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('[weblm] App container not found');
    return;
  }

  // Create main structure
  const statusBar = document.createElement('div');
  statusBar.id = 'status-container';
  
  const mainContent = document.createElement('div');
  mainContent.className = 'main-content';

  const title = document.createElement('h1');
  title.className = 'title';
  title.textContent = 'WebLM — Local AI Chat';

  const description = document.createElement('p');
  description.className = 'description';
  description.textContent = 'A fully local, privacy-first AI chat running entirely in your browser.';

  mainContent.appendChild(title);
  mainContent.appendChild(description);

  appContainer.appendChild(statusBar);
  appContainer.appendChild(mainContent);

  // Create status indicator
  createStatusIndicator(statusBar);

  // Check WebGPU support
  const capabilities = await checkWebGPUSupport();
  setWebGPUStatus(capabilities.isAvailable, capabilities.unavailableReason);

  // If WebGPU is not available, show error and stop
  if (!capabilities.isAvailable) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';

    const errorTitle = document.createElement('h3');
    errorTitle.textContent = '⚠️ WebGPU Not Available';

    const errorDesc = document.createElement('p');
    errorDesc.textContent = capabilities.unavailableReason || 'WebGPU is required for this application to run.';

    const recTitle = document.createElement('p');
    recTitle.textContent = 'Supported browsers:';
    recTitle.style.marginTop = 'var(--spacing-sm)';

    const recList = document.createElement('ul');
    WEBGPU_BROWSER_RECOMMENDATIONS.forEach(browser => {
      const li = document.createElement('li');
      li.textContent = browser;
      recList.appendChild(li);
    });

    const additionalInfo = document.createElement('p');
    additionalInfo.textContent = 'If you\'re using a supported browser, ensure hardware acceleration is enabled in your browser settings.';
    additionalInfo.style.marginTop = 'var(--spacing-sm)';

    errorDiv.appendChild(errorTitle);
    errorDiv.appendChild(errorDesc);
    errorDiv.appendChild(recTitle);
    errorDiv.appendChild(recList);
    errorDiv.appendChild(additionalInfo);

    mainContent.appendChild(errorDiv);
    return;
  }

  // Show storage status
  createStorageStatus(mainContent);

  // Check which models are cached
  const cachedModels = new Set<ModelVariant>();
  const smallCached = await checkModelCached('small');
  const largeCached = await checkModelCached('large');
  if (smallCached) cachedModels.add('small');
  if (largeCached) cachedModels.add('large');

  // Create model selector UI
  let selectedModel: ModelVariant = DEFAULT_MODEL;
  createModelSelector(mainContent, (model) => {
    selectedModel = model;
  }, cachedModels);

  // Pre-select the first cached model or default
  if (smallCached) {
    const smallOption = mainContent.querySelector('[data-model="small"]');
    smallOption?.classList.add('selected');
    selectedModel = 'small';
  } else {
    const defaultOption = mainContent.querySelector(`[data-model="${DEFAULT_MODEL}"]`);
    defaultOption?.classList.add('selected');
  }

  // Create progress bar container (hidden initially)
  const progressContainer = document.createElement('div');
  progressContainer.id = 'progress-wrapper';
  mainContent.appendChild(progressContainer);

  // Create action buttons
  const { setButtonsState } = createActionButtons(
    mainContent,
    // onLoad
    async (model: ModelVariant) => {
      if (isLoading) return;
      isLoading = true;

      // Check storage before loading
      const storage = await getStorageEstimate();
      const modelInfo = MODEL_INFO[model];
      const requiredSpace = modelInfo.vramMB * 1024 * 1024 * 1.5; // 1.5x safety margin

      if (cachedModels.has(model)) {
        // Model already cached, just load
        setButtonsState(false, 'Loading...');
        setModelStatus(MODEL_INFO[model].name, true);
      } else {
        // Need to download
        if (storage.available < requiredSpace) {
          alert(`Not enough storage space. Need ${modelInfo.size}, but only ${Math.round(storage.available / 1024 / 1024 / 1024)}GB available.`);
          isLoading = false;
          return;
        }

        setButtonsState(false, 'Downloading...');
        setStatusBadge('loading', `Preparing ${modelInfo.name}...`);
      }

      // Create progress bar
      progressContainer.innerHTML = '';
      createProgressBar(progressContainer);

      // Progress callback
      const onProgress: ProgressCallback = (progress) => {
        updateProgress(progress);
        setModelStatus(modelInfo.name, progress.phase !== 'ready');
      };

      try {
        await initializeEngine(model, onProgress);
        
        // Success!
        hideProgressBar();
        setModelStatus(modelInfo.name, false);
        
        // Update UI to show model is ready
        mainContent.innerHTML = `
          <h1 class="title">WebLM — Local AI Chat</h1>
          <p class="description">Model loaded and ready!</p>
          <div style="margin-top: var(--spacing-lg); padding: var(--spacing-lg); background-color: var(--color-surface); border-radius: var(--border-radius); border: 1px solid var(--color-success);">
            <p style="color: var(--color-success); font-weight: 600;">✓ ${MODEL_INFO[model].name} loaded successfully</p>
            <p style="color: var(--color-text-secondary); margin-top: var(--spacing-sm);">Ready to chat. This feature will be available in the next milestone.</p>
          </div>
        `;
        
        console.log(`[weblm] Model ${model} loaded successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[weblm] Model loading failed:', errorMessage);
        
        setModelStatus(null, false);
        showProgressError(`Failed to load model: ${errorMessage}`, () => {
          // Retry callback
          hideProgressBar();
          init(); // Restart
        });
        
        setButtonsState(true, 'Try Again');
        isLoading = false;
      }
    },
    // onClear
    async (model: ModelVariant) => {
      if (confirm(`Clear cache for ${MODEL_INFO[model].name}? You'll need to download it again next time.`)) {
        const { deleteCachedModel } = await import('./engine/index');
        await deleteCachedModel(model);
        location.reload();
      }
    }
  );

  // Update button text based on cache status
  if (cachedModels.has(selectedModel)) {
    setButtonsState(true, 'Load');
  } else {
    setButtonsState(true, 'Download');
  }

  // Set up online/offline status listeners
  window.addEventListener('online', () => setOnlineStatus(true));
  window.addEventListener('offline', () => setOnlineStatus(false));
  setOnlineStatus(navigator.onLine);

  console.log('[weblm] initialization complete');
}

// Start the application
init().catch(error => {
  console.error('[weblm] initialization failed:', error);
});
