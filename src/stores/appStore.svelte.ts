/**
 * App store — app-level reactive state.
 *
 * Manages: screen routing, online/offline, WebGPU availability, offline-ready flag.
 */

import type { AppState, Screen, WebGPUState } from './types';

const _state = $state<AppState>({
  screen: 'launcher',
  online: navigator.onLine,
  offlineReady: false,
  webgpu: { available: null },
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive app state (read-only reference). */
export function getAppState(): AppState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

/** Navigate to a different screen. */
export function setScreen(_screen: Screen): void {
  // TODO: implement
}

/** Update online/offline status. */
export function setOnline(_online: boolean): void {
  // TODO: implement
}

/** Mark app as offline-ready (service worker cached). */
export function setOfflineReady(_ready: boolean): void {
  // TODO: implement
}

/** Update WebGPU availability state. */
export function setWebGPU(_webgpu: WebGPUState): void {
  // TODO: implement
}
