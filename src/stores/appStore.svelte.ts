/**
 * App store — top-level application state.
 *
 * Manages: screen routing, online/offline, WebGPU availability, offline-ready flag.
 * Also handles initialization: theme apply, WebGPU check, service worker setup.
 */

import type { AppState, Screen, WebGPUState } from './types';
import { loadSettings } from '../settings';
import { applyThemeByName, watchSystemTheme } from '../lib/themes';
import { checkWebGPUSupport } from '../engine/webgpu-check';
import { registerServiceWorker, setupOfflineDetection, onOfflineStatusChange } from '../sw';
import { logger } from '../logger';

// ─── State ────────────────────────────────────────────────────

const _state = $state<AppState>({
  screen: 'launcher-home',
  online: navigator.onLine,
  offlineReady: false,
  webgpu: { available: null },
});

// ─── Derived ─────────────────────────────────────────────────

const _isWebGPUAvailable = $derived(_state.webgpu.available);
const _webgpuReason = $derived(_state.webgpu.reason);

export function isWebGPUAvailable(): boolean | null { return _isWebGPUAvailable; }
export function getWebGPUReason(): string | undefined { return _webgpuReason; }

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive app state. */
export function getAppState(): AppState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

export function setScreen(screen: Screen): void {
  _state.screen = screen;
}

export function setOnline(online: boolean): void {
  _state.online = online;
}

export function setOfflineReady(ready: boolean): void {
  _state.offlineReady = ready;
}

export function setWebGPU(webgpu: WebGPUState): void {
  _state.webgpu = webgpu;
}

// ─── Initialization ───────────────────────────────────────────

/**
 * Initialize the application:
 * - Apply saved theme
 * - Set up online/offline listeners
 * - Run WebGPU check
 * - Register service worker + offline detection
 */
export function init(): void {
  // Apply theme
  const settings = loadSettings();
  applyThemeByName(settings.theme);
  if (settings.theme === 'system') {
    watchSystemTheme(() => applyThemeByName('system'));
  }

  // Online/offline listeners
  window.addEventListener('online', () => { _state.online = true; });
  window.addEventListener('offline', () => { _state.online = false; });

  // WebGPU check (async, update state when done)
  checkWebGPUSupport().then(caps => {
    _state.webgpu = { available: caps.isAvailable, reason: caps.unavailableReason };
  });

  // Service worker + offline detection
  registerServiceWorker().then(() => {
    setupOfflineDetection();
    onOfflineStatusChange((isOffline, isReady) => {
      _state.online = !isOffline;
      if (isReady) _state.offlineReady = true;
    });
  });

  logger.info('App initialized');
}
