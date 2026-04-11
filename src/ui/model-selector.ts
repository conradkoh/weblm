/**
 * Model selector UI component.
 *
 * Responsibilities:
 * - Create model selection interface with family grouping
 * - Render recommended models prominently
 * - Show all models organized by family
 * - Handle search/filter
 * - Manage model selection state
 */

import {
  getModelsByFamily,
  getRecommendedModels,
  MODEL_FAMILIES,
  DEFAULT_MODEL_ID,
  type ModelInfo,
} from '../config';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getFamilyName(familyId: string): string {
  return MODEL_FAMILIES.find(f => f.id === familyId)?.name ?? familyId;
}

/**
 * Create a single model option element.
 */
function createModelOption(
  info: ModelInfo,
  isCached: boolean,
  onSelect: (modelId: string) => void
): HTMLElement {
  const div = document.createElement('div');
  div.className = 'model-option';
  div.setAttribute('data-model', info.modelId);
  div.setAttribute('role', 'radio');
  div.setAttribute('aria-checked', 'false');
  div.setAttribute('tabindex', '0');

  const tagHtml = (info.tags ?? [])
    .map(t => `<span class="model-tag">${t}</span>`)
    .join('');

  const cachedBadge = isCached
    ? '<span class="model-option-status">✓ Cached</span>'
    : '';

  const sizeStr = info.sizeGB > 0
    ? `~${info.sizeGB} GB`
    : info.vramMB > 0
      ? `~${Math.round(info.vramMB / 1024 * 10) / 10} GB VRAM`
      : '';

  div.innerHTML = `
    <div class="model-option-header">
      <span class="model-option-name">${info.displayName}</span>
      ${tagHtml}
      ${cachedBadge}
    </div>
    ${sizeStr ? `<span class="model-option-info">${sizeStr}</span>` : ''}
  `;

  div.addEventListener('click', () => onSelect(info.modelId));
  div.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(info.modelId);
    }
  });

  return div;
}

/**
 * Mark a model option as selected, deselecting all others.
 */
function setSelected(container: HTMLElement, modelId: string): void {
  container.querySelectorAll('.model-option').forEach(el => {
    const isThis = el.getAttribute('data-model') === modelId;
    el.classList.toggle('selected', isThis);
    el.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Create the model selection UI.
 *
 * @param cachedModelIds - Set of model IDs that are already cached locally.
 * @param onModelSelect  - Called whenever the user selects a different model.
 */
export function createModelSelectorUI(
  cachedModelIds: Set<string>,
  onModelSelect: (modelId: string) => void
): HTMLElement {
  const container = document.createElement('div');
  container.id = 'model-selector-container';
  container.setAttribute('role', 'radiogroup');
  container.setAttribute('aria-label', 'Model selection');

  let selectedModelId: string = DEFAULT_MODEL_ID;

  const handleSelect = (modelId: string) => {
    selectedModelId = modelId;
    setSelected(container, modelId);
    onModelSelect(modelId);
  };

  // ── Heading ────────────────────────────────────────────────
  const heading = document.createElement('h3');
  heading.style.cssText = 'margin-bottom: var(--spacing-md);';
  heading.textContent = 'Select a Model';
  container.appendChild(heading);

  // ── Search box ─────────────────────────────────────────────
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'margin-bottom: var(--spacing-md);';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search models…';
  searchInput.className = 'model-search';
  searchInput.setAttribute('aria-label', 'Search models');
  searchInput.style.cssText =
    'width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); font-size: var(--font-size-sm); box-sizing: border-box;';
  searchWrap.appendChild(searchInput);
  container.appendChild(searchWrap);

  // ── Recommended section ────────────────────────────────────
  const recommendedSection = document.createElement('div');
  recommendedSection.className = 'model-section';
  const recommendedHeading = document.createElement('h4');
  recommendedHeading.className = 'model-section-heading';
  recommendedHeading.textContent = '⭐ Recommended';
  recommendedSection.appendChild(recommendedHeading);

  for (const info of getRecommendedModels()) {
    recommendedSection.appendChild(
      createModelOption(info, cachedModelIds.has(info.modelId), handleSelect)
    );
  }
  container.appendChild(recommendedSection);

  // ── All models by family ───────────────────────────────────
  const allSection = document.createElement('div');
  allSection.className = 'model-section';
  const allHeading = document.createElement('h4');
  allHeading.className = 'model-section-heading';
  allHeading.textContent = 'All Models';
  allSection.appendChild(allHeading);

  const familyMap = getModelsByFamily();
  for (const [familyId, models] of familyMap) {
    const familyDiv = document.createElement('div');
    familyDiv.className = 'model-family';
    familyDiv.setAttribute('data-family', familyId);

    const familyHeading = document.createElement('div');
    familyHeading.className = 'model-family-heading';
    familyHeading.textContent = getFamilyName(familyId);
    familyDiv.appendChild(familyHeading);

    for (const info of models) {
      familyDiv.appendChild(
        createModelOption(info, cachedModelIds.has(info.modelId), handleSelect)
      );
    }

    allSection.appendChild(familyDiv);
  }
  container.appendChild(allSection);

  // ── Search filter logic ────────────────────────────────────
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();

    // Show/hide recommended section
    recommendedSection.style.display = query ? 'none' : '';

    // Filter individual model options in all-models section
    container.querySelectorAll<HTMLElement>('[data-model]').forEach(el => {
      const modelId = el.getAttribute('data-model') ?? '';
      const name = el.querySelector('.model-option-name')?.textContent?.toLowerCase() ?? '';
      const matches = !query || modelId.toLowerCase().includes(query) || name.includes(query);
      el.style.display = matches ? '' : 'none';
    });

    // Hide family headings when all their children are hidden
    container.querySelectorAll<HTMLElement>('.model-family').forEach(familyDiv => {
      const anyVisible = Array.from(familyDiv.querySelectorAll<HTMLElement>('[data-model]'))
        .some(el => el.style.display !== 'none');
      familyDiv.style.display = anyVisible ? '' : 'none';
    });
  });

  // ── Pre-select default ─────────────────────────────────────
  // Use a queued microtask so the DOM is fully built first
  queueMicrotask(() => {
    setSelected(container, selectedModelId);
    onModelSelect(selectedModelId);
  });

  return container;
}

/**
 * Create action buttons (load / clear cache).
 */
export function createLoadButtons(): {
  container: HTMLElement;
  setButtonsState: (enabled: boolean, text: string) => void;
} {
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
    },
  };
}

/**
 * Get the currently selected model ID from the selector container.
 */
export function getSelectedModel(container: HTMLElement): string | null {
  const selected = container.querySelector<HTMLElement>('.model-option.selected');
  return selected?.getAttribute('data-model') ?? null;
}
