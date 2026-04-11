/**
 * Launcher screen — model selection UI.
 *
 * Responsibilities:
 * - Create a clean launcher screen (first screen users see)
 * - Grouped <select> dropdown with recommended + family groups
 * - Model detail panel that updates on selection
 * - Load button with cached-status awareness
 */

import {
  getModelsByFamily,
  getRecommendedModels,
  getModelInfo,
  MODEL_FAMILIES,
  DEFAULT_MODEL_ID,
  type ModelInfo,
} from '../config';

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

function getFamilyLabel(familyId: string): string {
  return MODEL_FAMILIES.find(f => f.id === familyId)?.name ?? familyId;
}

function formatOptionLabel(info: ModelInfo): string {
  const size = info.sizeGB > 0 ? ` (~${info.sizeGB} GB)` : '';
  return `${info.displayName}${size}`;
}

function renderDetailPanel(
  panel: HTMLElement,
  info: ModelInfo | undefined,
  isCached: boolean
): void {
  if (!info) {
    panel.innerHTML = '<p class="launcher-detail-placeholder">Select a model to see details.</p>';
    return;
  }

  const familyDesc = MODEL_FAMILIES.find(f => f.id === info.family)?.description ?? '';
  const sizeStr = info.sizeGB > 0 ? `~${info.sizeGB} GB` : info.vramMB > 0 ? `${info.vramMB} MB` : 'Unknown';
  const vramStr = info.vramMB > 0 ? `~${Math.round(info.vramMB / 1024 * 10) / 10} GB` : 'Unknown';
  const tagHtml = (info.tags ?? []).length > 0
    ? info.tags!.map(t => `<span class="launcher-tag">${t}</span>`).join('')
    : '';
  const cachedBadge = isCached
    ? '<span class="launcher-cached-badge">✓ Cached locally</span>'
    : '';

  panel.innerHTML = `
    <div class="launcher-detail-content">
      <div class="launcher-detail-row">
        <span class="launcher-detail-label">Download size</span>
        <span class="launcher-detail-value">${sizeStr}</span>
      </div>
      <div class="launcher-detail-row">
        <span class="launcher-detail-label">VRAM needed</span>
        <span class="launcher-detail-value">${vramStr}</span>
      </div>
      ${tagHtml ? `
      <div class="launcher-detail-row">
        <span class="launcher-detail-label">Tags</span>
        <span class="launcher-detail-value">${tagHtml}</span>
      </div>` : ''}
      ${familyDesc ? `
      <div class="launcher-detail-row">
        <span class="launcher-detail-label">Family</span>
        <span class="launcher-detail-value launcher-family-desc">${familyDesc}</span>
      </div>` : ''}
      ${cachedBadge ? `<div class="launcher-cached-row">${cachedBadge}</div>` : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Create the launcher screen with a grouped model dropdown.
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
  container.className = 'launcher-selector';

  // ── Select label ───────────────────────────────────────────
  const label = document.createElement('label');
  label.htmlFor = 'model-select';
  label.className = 'launcher-select-label';
  label.textContent = 'Choose a model';
  container.appendChild(label);

  // ── Grouped <select> ──────────────────────────────────────
  const select = document.createElement('select');
  select.id = 'model-select';
  select.className = 'launcher-select';
  select.setAttribute('aria-label', 'Select AI model');

  // Placeholder option
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Select a model —';
  placeholder.disabled = true;
  select.appendChild(placeholder);

  // ── Group 1: Recommended ──────────────────────────────────
  const recommendedGroup = document.createElement('optgroup');
  recommendedGroup.label = '⭐ Recommended';
  for (const info of getRecommendedModels()) {
    const opt = document.createElement('option');
    opt.value = info.modelId;
    opt.textContent = formatOptionLabel(info);
    recommendedGroup.appendChild(opt);
  }
  select.appendChild(recommendedGroup);

  // ── Groups by family ──────────────────────────────────────
  const familyMap = getModelsByFamily();
  for (const [familyId, models] of familyMap) {
    if (models.length === 0) continue;
    const group = document.createElement('optgroup');
    group.label = getFamilyLabel(familyId);
    for (const info of models) {
      const opt = document.createElement('option');
      opt.value = info.modelId;
      opt.textContent = formatOptionLabel(info);
      group.appendChild(opt);
    }
    select.appendChild(group);
  }

  container.appendChild(select);

  // ── Detail panel ──────────────────────────────────────────
  const detailPanel = document.createElement('div');
  detailPanel.className = 'launcher-detail-panel';
  detailPanel.setAttribute('aria-live', 'polite');
  container.appendChild(detailPanel);

  // ── Selection handler ─────────────────────────────────────
  function handleSelection(modelId: string): void {
    const info = getModelInfo(modelId);
    const isCached = cachedModelIds.has(modelId);
    renderDetailPanel(detailPanel, info, isCached);
    onModelSelect(modelId);
  }

  select.addEventListener('change', () => {
    if (select.value) {
      handleSelection(select.value);
    }
  });

  // ── Pre-select default ────────────────────────────────────
  if (DEFAULT_MODEL_ID) {
    select.value = DEFAULT_MODEL_ID;
    if (select.value === DEFAULT_MODEL_ID) {
      // The option exists
      queueMicrotask(() => handleSelection(DEFAULT_MODEL_ID));
    } else {
      // Default not in list — show placeholder
      select.value = '';
      renderDetailPanel(detailPanel, undefined, false);
    }
  }

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
  container.className = 'launcher-buttons';

  const loadButton = document.createElement('button');
  loadButton.className = 'button launcher-load-btn';
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
  const select = container.querySelector<HTMLSelectElement>('#model-select');
  return select?.value || null;
}
