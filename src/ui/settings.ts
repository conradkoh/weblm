/**
 * Settings panel for model management.
 *
 * Responsibilities:
 * - Model selector UI
 * - Storage usage display
 * - Memory recommendations
 * - Model clearing/switching
 */

import { MODEL_INFO, type ModelVariant } from '../config';
import { checkModelCached, clearCachedModel, getStorageEstimate } from '../storage/index';
import { getCurrentModel, unloadEngine, getIsGenerating } from '../engine/index';
import type { ModelVariant as EngineModelVariant } from '../engine/types';

/** Aliases for clarity */
const isModelCached = checkModelCached;
const deleteCachedModel = clearCachedModel;

/** Settings panel element references */
let settingsPanel: HTMLElement | null = null;
let settingsOverlay: HTMLElement | null = null;

/** Callback types */
export type ModelChangeCallback = (model: ModelVariant) => Promise<void>;
export type ModelClearCallback = (model: ModelVariant) => Promise<void>;

/**
 * Create the settings panel UI.
 */
export function createSettingsButton(container: HTMLElement): HTMLElement {
  const button = document.createElement('button');
  button.className = 'settings-button';
  button.innerHTML = '⚙️';
  button.title = 'Model Settings';
  button.addEventListener('click', () => {
    showSettingsPanel();
  });
  container.appendChild(button);
  return button;
}

/**
 * Show the settings panel.
 */
export async function showSettingsPanel(): Promise<void> {
  if (settingsOverlay) {
    settingsOverlay.style.display = 'flex';
    return;
  }

  // Create overlay
  settingsOverlay = document.createElement('div');
  settingsOverlay.className = 'settings-overlay';
  settingsOverlay.innerHTML = `
    <div class="settings-panel">
      <div class="settings-header">
        <h2>Model Settings</h2>
        <button class="settings-close" id="settings-close">✕</button>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <h3>Available Models</h3>
          <div id="model-list"></div>
        </div>
        <div class="settings-section">
          <h3>Storage</h3>
          <div id="storage-info"></div>
        </div>
        <div class="settings-section">
          <h3>Memory Recommendation</h3>
          <div id="memory-info"></div>
        </div>
        <div class="settings-section settings-note">
          <p class="note">
            <strong>Note:</strong> Custom model loading from local files is coming soon.
            Currently only pre-trained models from WebLLM are available.
          </p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(settingsOverlay);

  // Close button
  const closeBtn = document.getElementById('settings-close');
  closeBtn?.addEventListener('click', () => {
    hideSettingsPanel();
  });

  // Close on overlay click
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      hideSettingsPanel();
    }
  });

  // Populate model list
  await populateModelList();

  // Update storage info
  await updateStorageInfo();

  // Update memory info
  updateMemoryInfo();
}

/**
 * Hide the settings panel.
 */
export function hideSettingsPanel(): void {
  if (settingsOverlay) {
    settingsOverlay.style.display = 'none';
  }
}

/**
 * Populate the model list.
 */
async function populateModelList(): Promise<void> {
  const modelList = document.getElementById('model-list');
  if (!modelList) return;

  modelList.innerHTML = '';

  const currentModel = getCurrentModel();
  const cachedModels = new Set<ModelVariant>();

  // Check cache status
  const smallCached = await isModelCached('small');
  const largeCached = await isModelCached('large');
  if (smallCached) cachedModels.add('small');
  if (largeCached) cachedModels.add('large');

  // Create model cards
  (['small', 'large'] as ModelVariant[]).forEach(model => {
    const info = MODEL_INFO[model];
    const isCached = cachedModels.has(model);
    const isCurrent = currentModel === model;

    const card = document.createElement('div');
    card.className = 'model-card';
    if (isCurrent) card.classList.add('current');
    if (isCached) card.classList.add('cached');

    card.innerHTML = `
      <div class="model-card-header">
        <span class="model-name">${info.name}</span>
        ${isCurrent ? '<span class="model-badge current-badge">Loaded</span>' : ''}
        ${isCached && !isCurrent ? '<span class="model-badge cached-badge">Cached</span>' : ''}
      </div>
      <div class="model-card-info">
        <span class="model-size">Size: ${info.size}</span>
        <span class="model-memory">VRAM: ~${Math.round(info.vramMB / 1000)}GB</span>
      </div>
      <div class="model-card-actions">
        ${isCurrent ? '<span class="model-action-label">Currently loaded</span>' : ''}
        ${!isCurrent ? `<button class="button model-switch-btn" data-model="${model}">Switch to this model</button>` : ''}
        ${isCached && !isCurrent ? `<button class="button button-secondary model-clear-btn" data-model="${model}">Clear cache</button>` : ''}
      </div>
    `;

    modelList.appendChild(card);
  });

  // Add event listeners
  modelList.querySelectorAll('.model-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const model = (btn as HTMLElement).dataset.model as ModelVariant;
      hideSettingsPanel();
      window.dispatchEvent(new CustomEvent('model-switch', { detail: { model } }));
    });
  });

  modelList.querySelectorAll('.model-clear-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const model = (btn as HTMLElement).dataset.model as ModelVariant;
      if (confirm(`Clear cache for ${MODEL_INFO[model].name}? You'll need to download it again.`)) {
        await deleteCachedModel(model);
        await populateModelList();
        await updateStorageInfo();
      }
    });
  });
}

/**
 * Update storage info display.
 */
async function updateStorageInfo(): Promise<void> {
  const storageInfo = document.getElementById('storage-info');
  if (!storageInfo) return;

  const { quota, usage, available } = await getStorageEstimate();

  const usagePercent = quota > 0 ? Math.round((usage / quota) * 100) : 0;

  storageInfo.innerHTML = `
    <div class="storage-bar">
      <div class="storage-bar-fill" style="width: ${usagePercent}%"></div>
    </div>
    <div class="storage-text">
      <span>${formatBytes(usage)} used</span>
      <span>${formatBytes(available)} available</span>
      <span>${formatBytes(quota)} total</span>
    </div>
  `;
}

/**
 * Update memory recommendation display.
 */
function updateMemoryInfo(): void {
  const memoryInfo = document.getElementById('memory-info');
  if (!memoryInfo) return;

  // Get WebGPU capabilities from session or recalculate
  const storedMemory = sessionStorage.getItem('weblm-memory-mb');
  const memoryMB = storedMemory ? parseInt(storedMemory, 10) : 0;

  let recommendation = '';
  let recommendedModel: ModelVariant = 'small';

  if (memoryMB < 2000) {
    recommendation = '⚠️ Low memory detected. The small model is recommended. Performance may be limited.';
    recommendedModel = 'small';
  } else if (memoryMB < 4000) {
    recommendation = '✓ The small model (Gemma 2 2B) is recommended for your available memory.';
    recommendedModel = 'small';
  } else {
    recommendation = '✓ You have enough memory for either model. The large model offers better quality.';
    recommendedModel = 'large';
  }

  memoryInfo.innerHTML = `
    <div class="memory-status">
      <p>Estimated available memory: ~${Math.round(memoryMB / 1000)}GB</p>
      <p class="memory-recommendation">${recommendation}</p>
    </div>
  `;
}

/**
 * Format bytes to human readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Toggle settings panel visibility.
 */
export function toggleSettingsPanel(): void {
  if (settingsOverlay && settingsOverlay.style.display !== 'none') {
    hideSettingsPanel();
  } else {
    showSettingsPanel();
  }
}

/**
 * Refresh settings panel data.
 */
export async function refreshSettingsPanel(): Promise<void> {
  if (settingsOverlay && settingsOverlay.style.display !== 'none') {
    await populateModelList();
    await updateStorageInfo();
    updateMemoryInfo();
  }
}