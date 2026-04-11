/**
 * WebLM — Local-first AI chat powered by Gemma 4 via WebLLM.
 *
 * Entry point. Initializes the UI and engine subsystems.
 */

import { checkWebGPUSupport, WEBGPU_BROWSER_RECOMMENDATIONS } from './engine/webgpu-check';
import { injectGlobalStyles, lightTheme, applyTheme } from './ui/styles';
import { createStatusIndicator, setWebGPUStatus, setOnlineStatus } from './ui/status';

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

  // Status indicator container
  const statusSection = document.createElement('div');
  statusSection.id = 'status-section';

  appContainer.appendChild(statusBar);
  appContainer.appendChild(mainContent);

  // Create status indicator
  createStatusIndicator(statusBar);

  // Check WebGPU support
  const capabilities = await checkWebGPUSupport();
  setWebGPUStatus(capabilities.isAvailable, capabilities.unavailableReason);

  // If WebGPU is not available, show error message
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
  } else {
    // Show success message
    const successDiv = document.createElement('div');
    successDiv.className = 'status-indicator';
    successDiv.innerHTML = `
      <span style="color: var(--color-success);">✓ WebGPU detected</span>
      <span style="color: var(--color-text-secondary); margin-left: var(--spacing-sm);">
        Ready to load model
      </span>
    `;
    mainContent.appendChild(successDiv);

    // Show estimated memory
    if (capabilities.estimatedMemoryMB) {
      const memoryInfo = document.createElement('p');
      memoryInfo.style.color = 'var(--color-text-secondary)';
      memoryInfo.style.marginTop = 'var(--spacing-md)';
      memoryInfo.textContent = `Estimated available memory: ~${Math.round(capabilities.estimatedMemoryMB / 1024)} GB`;
      mainContent.appendChild(memoryInfo);
    }
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
