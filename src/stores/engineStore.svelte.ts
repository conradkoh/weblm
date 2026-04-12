/**
 * Engine store — model lifecycle reactive state.
 *
 * Manages: engine status, current model, loading progress, cached models, errors.
 */

import type { EngineState, EngineStatus, ModelProgress } from './types';

const _state = $state<EngineState>({
  status: 'idle',
  currentModelId: null,
  modelDisplayName: null,
  progress: null,
  error: null,
  cachedModelIds: new Set(),
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive engine state (read-only reference). */
export function getEngineState(): EngineState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

/** Start loading a model. */
export function startLoading(_modelId: string, _displayName: string): void {
  // TODO: implement
}

/** Update loading progress. */
export function updateProgress(_progress: ModelProgress): void {
  // TODO: implement
}

/** Mark a model as successfully loaded. */
export function setModelReady(_modelId: string, _displayName: string): void {
  // TODO: implement
}

/** Set an error that occurred during loading. */
export function setEngineError(_error: string): void {
  // TODO: implement
}

/** Reset engine to idle state. */
export function resetEngine(): void {
  // TODO: implement
}

/** Update the set of cached model IDs. */
export function setCachedModelIds(_ids: Set<string>): void {
  // TODO: implement
}
