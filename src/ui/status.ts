/**
 * Status indicator component.
 *
 * Responsibilities:
 * - Display online/offline status
 * - Show WebGPU availability status
 * - Indicate model loaded state
 * - Display current model name (E2B/E4B)
 * - Connection quality indicator
 */

/**
 * Status badge type.
 */
export type StatusType = 'success' | 'warning' | 'error' | 'loading';

/** Container element for status indicators */
let statusContainer: HTMLElement | null = null;

/** Current status values */
const currentStatus = {
  webgpuSupported: false,
  webgpuReason: undefined as string | undefined,
  online: navigator.onLine,
  modelName: null as string | null,
  modelLoading: false,
};

/**
 * Create and mount the status indicator component.
 */
export function createStatusIndicator(container: HTMLElement): void {
  // Create the status bar
  const statusBar = document.createElement('div');
  statusBar.className = 'status-bar';
  statusBar.id = 'status-bar';
  statusBar.setAttribute('role', 'status');
  statusBar.setAttribute('aria-live', 'polite');
  statusBar.setAttribute('aria-label', 'Application status');

  // WebGPU status
  const webgpuIndicator = document.createElement('div');
  webgpuIndicator.className = 'status-indicator';
  webgpuIndicator.id = 'webgpu-status';
  webgpuIndicator.setAttribute('aria-label', 'WebGPU status');
  webgpuIndicator.innerHTML = `
    <span class="status-dot loading" aria-hidden="true"></span>
    <span id="webgpu-text">Checking WebGPU...</span>
  `;

  // Online status
  const onlineIndicator = document.createElement('div');
  onlineIndicator.className = 'status-indicator';
  onlineIndicator.id = 'online-status';
  onlineIndicator.setAttribute('aria-label', 'Connection status');
  onlineIndicator.innerHTML = `
    <span class="status-dot ${navigator.onLine ? 'success' : 'error'}" aria-hidden="true"></span>
    <span>${navigator.onLine ? 'Online' : 'Offline'}</span>
  `;

  statusBar.appendChild(webgpuIndicator);
  statusBar.appendChild(onlineIndicator);

  // Add model status container (hidden initially)
  const modelIndicator = document.createElement('div');
  modelIndicator.className = 'status-indicator';
  modelIndicator.id = 'model-status';
  modelIndicator.style.display = 'none';
  modelIndicator.setAttribute('aria-label', 'Model status');
  statusBar.appendChild(modelIndicator);

  container.appendChild(statusBar);
  statusContainer = container;
}

/**
 * Update WebGPU support status.
 */
export function setWebGPUStatus(supported: boolean, reason?: string): void {
  currentStatus.webgpuSupported = supported;
  currentStatus.webgpuReason = reason;

  const indicator = document.getElementById('webgpu-status');
  const dot = indicator?.querySelector('.status-dot');
  const text = document.getElementById('webgpu-text');

  if (!indicator || !dot || !text) return;

  if (supported) {
    dot.className = 'status-dot success';
    text.textContent = 'WebGPU Available';
  } else {
    dot.className = 'status-dot error';
    text.textContent = 'WebGPU Unavailable';
    indicator.title = reason || 'WebGPU is not available';
  }
}

/**
 * Update online/offline status.
 */
export function setOnlineStatus(online: boolean): void {
  currentStatus.online = online;

  const indicator = document.getElementById('online-status');
  const dot = indicator?.querySelector('.status-dot');
  const text = indicator?.querySelector('span:last-child');

  if (!indicator || !dot || !text) return;

  dot.className = `status-dot ${online ? 'success' : 'error'}`;
  text.textContent = online ? 'Online' : 'Offline';
}

/**
 * Set the currently loaded model status.
 */
export function setModelStatus(modelName: string | null, loading: boolean): void {
  currentStatus.modelName = modelName;
  currentStatus.modelLoading = loading;

  const indicator = document.getElementById('model-status');

  if (!indicator) return;

  if (!modelName && !loading) {
    indicator.style.display = 'none';
    return;
  }

  indicator.style.display = 'flex';

  if (loading) {
    indicator.innerHTML = `
      <span class="status-dot loading"></span>
      <span>Loading model...</span>
    `;
  } else if (modelName) {
    indicator.innerHTML = `
      <span class="status-dot success"></span>
      <span>Model: ${modelName}</span>
    `;
  }
}

/**
 * Set a general status badge.
 */
export function setStatusBadge(type: StatusType, message: string): void {
  // This can be used for custom status messages
  const indicator = document.getElementById('model-status');

  if (!indicator) return;

  indicator.style.display = 'flex';
  indicator.innerHTML = `
    <span class="status-dot ${type}"></span>
    <span>${message}</span>
  `;
}

/**
 * Set the offline-ready status.
 * Shows when service worker is active and app can work offline.
 */
export function setOfflineReadyStatus(ready: boolean): void {
  // Find or create the offline-ready indicator
  let indicator = document.getElementById('offline-ready-status');
  
  if (!ready) {
    if (indicator) {
      indicator.style.display = 'none';
    }
    return;
  }

  if (!indicator) {
    // Create new indicator
    indicator = document.createElement('div');
    indicator.className = 'status-indicator';
    indicator.id = 'offline-ready-status';
    indicator.innerHTML = `
      <span class="status-dot success"></span>
      <span>Offline Ready ✓</span>
    `;
    indicator.title = 'App is cached and can work offline';
    
    // Add after online status
    const onlineStatus = document.getElementById('online-status');
    if (onlineStatus && onlineStatus.parentElement) {
      onlineStatus.parentElement.insertBefore(indicator, onlineStatus.nextSibling);
    }
  } else {
    indicator.style.display = 'flex';
  }
}