/**
 * Engine store — model lifecycle reactive state.
 *
 * Manages: engine status, current model, loading progress, cached models, errors.
 * Encapsulates all model loading/unloading/caching logic.
 */

import type { EngineState, EngineStatus, ModelProgress } from './types';
import {
  initializeEngine,
  deleteCachedModel as deleteFromEngine,
  unloadEngine,
} from '../engine/index';
import {
  checkModelCached,
  getStorageEstimate,
  getStorageStatus,
} from '../storage/index';
import { getModelInfo, getModelCatalog } from '../config';
import { logger } from '../logger';
// Lazy store imports to avoid circular dependency issues at module load time
import { setScreen } from './appStore.svelte';
import { clearMessages } from './chatStore.svelte';

// ─── State ────────────────────────────────────────────────────

const _state = $state<EngineState>({
  status: 'idle',
  currentModelId: null,
  modelDisplayName: null,
  progress: null,
  error: null,
  cachedModelIds: new Set(),
});

// ─── Derived ─────────────────────────────────────────────────

const _isLoading = $derived(_state.status === 'loading');
const _isReady = $derived(_state.status === 'ready');
const _modelDisplayName = $derived(_state.modelDisplayName);

export function isLoading(): boolean { return _isLoading; }
export function isReady(): boolean { return _isReady; }
export function getModelDisplayName(): string | null { return _modelDisplayName; }

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive engine state. */
export function getEngineState(): EngineState {
  return _state;
}

// ─── Mutations (internal) ─────────────────────────────────────

function _setStatus(status: EngineStatus): void {
  _state.status = status;
}

export function startLoading(modelId: string, displayName: string): void {
  _state.status = 'loading';
  _state.currentModelId = modelId;
  _state.modelDisplayName = displayName;
  _state.progress = null;
  _state.error = null;
}

export function updateProgress(progress: ModelProgress): void {
  _state.progress = progress;
}

export function setModelReady(modelId: string, displayName: string): void {
  _state.status = 'ready';
  _state.currentModelId = modelId;
  _state.modelDisplayName = displayName;
  _state.progress = null;
  _state.error = null;
}

export function setEngineError(error: string): void {
  _state.status = 'error';
  _state.error = error;
  _state.progress = null;
}

export function resetEngine(): void {
  _state.status = 'idle';
  _state.progress = null;
  _state.error = null;
}

export function setCachedModelIds(ids: Set<string>): void {
  _state.cachedModelIds = ids;
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Scan the model catalog and update the set of cached model IDs.
 */
export async function refreshCachedModels(): Promise<void> {
  const catalog = getModelCatalog();
  const ids = new Set<string>();
  await Promise.all(
    catalog.map(async info => {
      if (await checkModelCached(info.modelId)) ids.add(info.modelId);
    })
  );
  _state.cachedModelIds = ids;
}

/**
 * Get storage status string (for display in launcher).
 */
export async function getStorageInfo(): Promise<string> {
  return getStorageStatus();
}

/**
 * Load a model by ID. Updates progress reactively during loading.
 * Returns true on success, false on failure.
 */
export async function loadModel(modelId: string): Promise<boolean> {
  const modelInfo = getModelInfo(modelId);
  const displayName = modelInfo?.displayName ?? modelId;

  // Check storage if not cached
  if (!_state.cachedModelIds.has(modelId)) {
    const storage = await getStorageEstimate();
    const requiredSpace = (modelInfo?.vramMB ?? 0) * 1024 * 1024 * 1.5;
    if (requiredSpace > 0 && storage.available < requiredSpace) {
      const sizeStr = modelInfo?.sizeGB ? `${modelInfo.sizeGB} GB` : 'the model';
      const availableGB = Math.round(storage.available / 1024 / 1024 / 1024);
      setEngineError(`Not enough storage space. Need ~${sizeStr}, but only ${availableGB}GB available.`);
      return false;
    }
  }

  startLoading(modelId, displayName);

  try {
    await initializeEngine(modelId, (progress) => {
      updateProgress(progress);
    });
    setModelReady(modelId, displayName);
    // Notify app store: transition to chat screen
    setScreen('chat');
    logger.info(`Model ${modelId} loaded successfully`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Model loading failed:', msg);
    setEngineError(`Failed to load model: ${msg}`);
    return false;
  }
}

/**
 * Unload the current model.
 */
export async function unloadModel(): Promise<void> {
  await unloadEngine();
  resetEngine();
  _state.currentModelId = null;
  _state.modelDisplayName = null;
}

/**
 * Switch to a new model (unload current, then load new).
 * Returns true on success.
 */
export async function switchModel(newModelId: string): Promise<boolean> {
  await unloadEngine();
  resetEngine();
  // Clear chat messages when switching models
  clearMessages();
  return loadModel(newModelId);
}

/**
 * Delete a cached model and refresh the cached model list.
 */
export async function deleteCachedModel(modelId: string): Promise<void> {
  await deleteFromEngine(modelId);
  await refreshCachedModels();
}
