/**
 * Settings panel for model management and user preferences.
 *
 * Responsibilities:
 * - Model selector UI
 * - Storage usage display
 * - Memory recommendations
 * - Model clearing/switching
 * - Generation settings (temperature, max tokens, top_p)
 * - System prompt configuration
 * - Theme toggle (light/dark/system)
 * - Chat export (text/markdown)
 */

import { MODEL_INFO, DEFAULT_GENERATION_CONFIG, type ModelVariant } from '../config';
import { checkModelCached, clearCachedModel, getStorageEstimate } from '../storage/index';
import { getCurrentModel, unloadEngine, getIsGenerating } from '../engine/index';
import type { ModelVariant as EngineModelVariant } from '../engine/types';
import {
  loadSettings,
  saveSettings,
  resetSettings,
  getTemperature,
  setTemperature,
  getMaxTokens,
  setMaxTokens,
  getTopP,
  setTopP,
  getSystemPrompt,
  setSystemPrompt,
  getTheme,
  setTheme,
  getShowMetrics,
  setShowMetrics,
  type Theme,
  type AppSettings,
} from '../settings';
import { lightTheme, darkTheme, applyThemeByName, watchSystemTheme } from './styles';
import type { ChatMessage } from '../types';

/** Aliases for clarity */
const isModelCached = checkModelCached;
const deleteCachedModel = clearCachedModel;

/** Settings panel element references */
let settingsPanel: HTMLElement | null = null;
let settingsOverlay: HTMLElement | null = null;

/** System theme watcher unsubscribe */
let systemThemeUnsubscribe: (() => void) | null = null;

/** Callback types */
export type ModelChangeCallback = (model: ModelVariant) => Promise<void>;
export type ModelClearCallback = (model: ModelVariant) => Promise<void>;
export type SettingsChangeCallback = (settings: AppSettings) => void;
export type ExportCallback = (format: 'txt' | 'md') => void;

/** Chat export callback */
let exportCallback: ExportCallback | null = null;

/**
 * Set the export callback for chat history.
 */
export function setExportCallback(callback: ExportCallback): void {
  exportCallback = callback;
}

/**
 * Create the settings panel UI.
 */
export function createSettingsButton(container: HTMLElement): HTMLElement {
  const button = document.createElement('button');
  button.className = 'settings-button';
  button.innerHTML = '⚙️';
  button.title = 'Settings';
  button.setAttribute('aria-label', 'Open settings');
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

  // Load current settings
  const settings = loadSettings();

  // Create overlay
  settingsOverlay = document.createElement('div');
  settingsOverlay.className = 'settings-overlay';
  settingsOverlay.setAttribute('role', 'dialog');
  settingsOverlay.setAttribute('aria-modal', 'true');
  settingsOverlay.setAttribute('aria-labelledby', 'settings-title');
  settingsOverlay.innerHTML = `
    <div class="settings-panel">
      <div class="settings-header">
        <h2 id="settings-title">Settings</h2>
        <button class="settings-close" id="settings-close" aria-label="Close settings">✕</button>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <h3>Available Models</h3>
          <div id="model-list"></div>
        </div>
        <div class="settings-section">
          <h3>Generation</h3>
          <div id="generation-settings"></div>
        </div>
        <div class="settings-section">
          <h3>System Prompt</h3>
          <div id="system-prompt-settings"></div>
        </div>
        <div class="settings-section">
          <h3>Appearance</h3>
          <div id="theme-settings"></div>
        </div>
        <div class="settings-section">
          <h3>Performance</h3>
          <div id="performance-settings"></div>
        </div>
        <div class="settings-section">
          <h3>Export Chat</h3>
          <div id="export-settings"></div>
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

  // Populate generation settings
  populateGenerationSettings(settings);

  // Populate system prompt
  populateSystemPrompt(settings);

  // Populate theme settings
  populateThemeSettings(settings);

  // Populate performance settings
  populatePerformanceSettings(settings);

  // Populate export options
  populateExportOptions();

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

/**
 * Populate generation settings section.
 */
function populateGenerationSettings(settings: AppSettings): void {
  const container = document.getElementById('generation-settings');
  if (!container) return;

  container.innerHTML = `
    <div class="setting-row">
      <label for="temperature-slider">Temperature: <span id="temperature-value">${settings.temperature.toFixed(1)}</span></label>
      <input type="range" id="temperature-slider" min="0" max="2" step="0.1" value="${settings.temperature}" aria-label="Temperature slider">
      <span class="setting-hint">Higher = more creative, Lower = more deterministic</span>
    </div>
    <div class="setting-row">
      <label for="max-tokens-slider">Max Tokens: <span id="max-tokens-value">${settings.maxTokens}</span></label>
      <input type="range" id="max-tokens-slider" min="16" max="4096" step="16" value="${settings.maxTokens}" aria-label="Max tokens slider">
      <span class="setting-hint">Maximum response length</span>
    </div>
    <div class="setting-row">
      <label for="top-p-slider">Top P: <span id="top-p-value">${settings.topP.toFixed(2)}</span></label>
      <input type="range" id="top-p-slider" min="0" max="1" step="0.05" value="${settings.topP}" aria-label="Top P slider">
      <span class="setting-hint">Nucleus sampling threshold</span>
    </div>
    <div class="setting-row">
      <button class="button button-secondary" id="reset-generation-btn" aria-label="Reset generation settings to defaults">Reset to Defaults</button>
    </div>
  `;

  // Temperature slider
  const tempSlider = document.getElementById('temperature-slider') as HTMLInputElement;
  const tempValue = document.getElementById('temperature-value');
  tempSlider?.addEventListener('input', () => {
    const value = parseFloat(tempSlider.value);
    if (tempValue) tempValue.textContent = value.toFixed(1);
    setTemperature(value);
  });

  // Max tokens slider
  const maxTokensSlider = document.getElementById('max-tokens-slider') as HTMLInputElement;
  const maxTokensValue = document.getElementById('max-tokens-value');
  maxTokensSlider?.addEventListener('input', () => {
    const value = parseInt(maxTokensSlider.value);
    if (maxTokensValue) maxTokensValue.textContent = String(value);
    setMaxTokens(value);
  });

  // Top P slider
  const topPSlider = document.getElementById('top-p-slider') as HTMLInputElement;
  const topPValue = document.getElementById('top-p-value');
  topPSlider?.addEventListener('input', () => {
    const value = parseFloat(topPSlider.value);
    if (topPValue) topPValue.textContent = value.toFixed(2);
    setTopP(value);
  });

  // Reset button
  const resetBtn = document.getElementById('reset-generation-btn');
  resetBtn?.addEventListener('click', () => {
    setTemperature(DEFAULT_GENERATION_CONFIG.temperature);
    setMaxTokens(DEFAULT_GENERATION_CONFIG.maxTokens);
    setTopP(DEFAULT_GENERATION_CONFIG.topP);
    // Repopulate to update UI
    const newSettings = loadSettings();
    populateGenerationSettings(newSettings);
  });
}

/**
 * Populate system prompt section.
 */
function populateSystemPrompt(settings: AppSettings): void {
  const container = document.getElementById('system-prompt-settings');
  if (!container) return;

  container.innerHTML = `
    <textarea id="system-prompt-input" rows="3" placeholder="Enter a system prompt..." aria-label="System prompt">${settings.systemPrompt}</textarea>
    <span class="setting-hint">System prompt is prepended to all conversations.</span>
  `;

  const textarea = document.getElementById('system-prompt-input') as HTMLTextAreaElement;
  textarea?.addEventListener('change', () => {
    setSystemPrompt(textarea.value);
  });

  // Auto-resize textarea
  textarea?.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  });
}

/**
 * Populate theme settings section.
 */
function populateThemeSettings(settings: AppSettings): void {
  const container = document.getElementById('theme-settings');
  if (!container) return;

  container.innerHTML = `
    <div class="theme-options" role="radiogroup" aria-label="Theme selection">
      <label class="theme-option ${settings.theme === 'light' ? 'selected' : ''}">
        <input type="radio" name="theme" value="light" ${settings.theme === 'light' ? 'checked' : ''} aria-label="Light theme">
        <span class="theme-label">☀️ Light</span>
      </label>
      <label class="theme-option ${settings.theme === 'dark' ? 'selected' : ''}">
        <input type="radio" name="theme" value="dark" ${settings.theme === 'dark' ? 'checked' : ''} aria-label="Dark theme">
        <span class="theme-label">🌙 Dark</span>
      </label>
      <label class="theme-option ${settings.theme === 'system' ? 'selected' : ''}">
        <input type="radio" name="theme" value="system" ${settings.theme === 'system' ? 'checked' : ''} aria-label="System theme">
        <span class="theme-label">💻 System</span>
      </label>
    </div>
  `;

  // Theme change handlers
  container.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const newTheme = target.value as Theme;
      setTheme(newTheme);
      applyThemeByName(newTheme);
      
      // Update selected class
      container.querySelectorAll('.theme-option').forEach((opt) => {
        opt.classList.remove('selected');
      });
      target.closest('.theme-option')?.classList.add('selected');
    });
  });
}

/**
 * Populate export options section.
 */
function populateExportOptions(): void {
  const container = document.getElementById('export-settings');
  if (!container) return;

  container.innerHTML = `
    <div class="export-buttons">
      <button class="button button-secondary" id="export-txt-btn" aria-label="Export chat as text file">Export as Text (.txt)</button>
      <button class="button button-secondary" id="export-md-btn" aria-label="Export chat as markdown file">Export as Markdown (.md)</button>
    </div>
    <span class="setting-hint">Download current chat history as a file.</span>
  `;

  const exportTxtBtn = document.getElementById('export-txt-btn');
  const exportMdBtn = document.getElementById('export-md-btn');

  exportTxtBtn?.addEventListener('click', () => {
    if (exportCallback) {
      exportCallback('txt');
    }
  });

  exportMdBtn?.addEventListener('click', () => {
    if (exportCallback) {
      exportCallback('md');
    }
  });
}

/**
 * Populate performance settings section.
 */
function populatePerformanceSettings(settings: AppSettings): void {
  const container = document.getElementById('performance-settings');
  if (!container) return;

  container.innerHTML = `
    <div class="setting-row">
      <label class="checkbox-label">
        <input type="checkbox" id="show-metrics-checkbox" ${settings.showMetrics ? 'checked' : ''} aria-label="Show performance metrics">
        <span>Show performance metrics</span>
      </label>
      <span class="setting-hint">Display TTFT, tokens/sec, and generation time below each response.</span>
    </div>
  `;

  const checkbox = document.getElementById('show-metrics-checkbox') as HTMLInputElement;
  checkbox?.addEventListener('change', () => {
    setShowMetrics(checkbox.checked);
  });
}