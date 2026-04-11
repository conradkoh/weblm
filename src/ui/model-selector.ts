/**
 * Model selector UI component.
 *
 * Responsibilities:
 * - Create model selection interface
 * - Handle model option rendering
 * - Manage model selection state
 * - Display "Coming Soon" models
 */

import { MODEL_INFO, DEFAULT_MODEL, MODEL_VARIANTS, COMING_SOON_MODELS, type ModelVariant } from '../config';

/**
 * Create the model selection UI.
 */
export function createModelSelectorUI(
  cachedModels: Set<ModelVariant>,
  onModelSelect: (model: ModelVariant) => void
): HTMLElement {
  const container = document.createElement('div');
  container.id = 'model-selector-container';
  container.setAttribute('role', 'radiogroup');
  container.setAttribute('aria-label', 'Model selection');
  container.innerHTML = '<h3 style="margin-bottom: var(--spacing-md);">Select a Model</h3>';

  let selectedModel: ModelVariant = DEFAULT_MODEL;

  // Render available models
  MODEL_VARIANTS.forEach(model => {
    const info = MODEL_INFO[model];
    const isCached = cachedModels.has(model);
    const hasWarning = !info.hasWasm;

    const optionDiv = document.createElement('div');
    optionDiv.className = 'model-option';
    if (hasWarning) {
      optionDiv.classList.add('model-option-warning');
    }
    optionDiv.setAttribute('data-model', model);
    optionDiv.setAttribute('role', 'radio');
    optionDiv.setAttribute('aria-checked', 'false');
    optionDiv.setAttribute('tabindex', '0');

    const warningIcon = hasWarning ? ' ⚠️' : '';
    const warningText = hasWarning ? ' (WASM pending)' : '';

    optionDiv.innerHTML = `
      <span class="model-option-name">${info.name}${warningText}${warningIcon}</span>
      <span class="model-option-info">${info.size}</span>
      ${isCached ? '<span class="model-option-status">✓ Cached locally</span>' : ''}
    `;

    optionDiv.addEventListener('click', () => {
      container.querySelectorAll('.model-option').forEach(el => {
        el.classList.remove('selected');
        el.setAttribute('aria-checked', 'false');
      });
      optionDiv.classList.add('selected');
      optionDiv.setAttribute('aria-checked', 'true');
      selectedModel = model;
      onModelSelect(model);
    });

    // Keyboard support
    optionDiv.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        optionDiv.click();
      }
    });

    container.appendChild(optionDiv);
  });

  // Add "Coming Soon" section
  const comingSoonSection = document.createElement('div');
  comingSoonSection.className = 'model-coming-soon';
  comingSoonSection.innerHTML = '<h4 style="margin-top: var(--spacing-lg); color: var(--text-secondary);">Coming Soon</h4>';

  COMING_SOON_MODELS.forEach(model => {
    const comingSoonDiv = document.createElement('div');
    comingSoonDiv.className = 'model-option model-option-disabled';
    comingSoonDiv.setAttribute('aria-disabled', 'true');
    comingSoonDiv.innerHTML = `
      <span class="model-option-name" style="color: var(--text-secondary);">${model.name}</span>
      <span class="model-option-info" style="color: var(--text-secondary);">${model.status}</span>
    `;
    comingSoonSection.appendChild(comingSoonDiv);
  });

  container.appendChild(comingSoonSection);

  // Pre-select default or cached
  if (cachedModels.has(DEFAULT_MODEL)) {
    const defaultOption = container.querySelector(`[data-model="${DEFAULT_MODEL}"]`);
    defaultOption?.classList.add('selected');
    defaultOption?.setAttribute('aria-checked', 'true');
    selectedModel = DEFAULT_MODEL;
  } else {
    const defaultOption = container.querySelector(`[data-model="${DEFAULT_MODEL}"]`);
    defaultOption?.classList.add('selected');
    defaultOption?.setAttribute('aria-checked', 'true');
  }

  // Call callback with initial selection
  onModelSelect(selectedModel);

  return container;
}

/**
 * Create action buttons (download/load).
 */
export function createLoadButtons(): { container: HTMLElement; setButtonsState: (enabled: boolean, text: string) => void } {
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);';

  const loadButton = document.createElement('button');
  loadButton.className = 'button';
  loadButton.id = 'load-button';
  loadButton.textContent = 'Load Model';
  loadButton.setAttribute('aria-label', 'Load selected model');

  const clearButton = document.createElement('button');
  clearButton.className = 'button button-secondary';
  clearButton.id = 'clear-button';
  clearButton.textContent = 'Clear Cache';
  clearButton.style.display = 'none';
  clearButton.setAttribute('aria-label', 'Clear cached model');

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
 * Get the currently selected model from the UI.
 */
export function getSelectedModel(container: HTMLElement): ModelVariant | null {
  const selected = container.querySelector('.model-option.selected');
  return selected?.getAttribute('data-model') as ModelVariant | null;
}