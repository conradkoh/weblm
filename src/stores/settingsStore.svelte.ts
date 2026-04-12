/**
 * Settings store — reactive wrapper around localStorage-backed settings.
 *
 * Keeps an in-memory reactive copy of settings so components
 * can subscribe to changes without polling localStorage.
 */

import type { SettingsState, Theme } from './types';
import { DEFAULT_SETTINGS } from '../settings';

const _state = $state<SettingsState>({
  temperature: DEFAULT_SETTINGS.temperature,
  maxTokens: DEFAULT_SETTINGS.maxTokens,
  topP: DEFAULT_SETTINGS.topP,
  systemPrompt: DEFAULT_SETTINGS.systemPrompt,
  theme: DEFAULT_SETTINGS.theme,
  showMetrics: DEFAULT_SETTINGS.showMetrics,
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive settings state. */
export function getSettingsState(): SettingsState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

/** Load settings from localStorage into the reactive store. */
export function loadSettingsIntoStore(): void {
  // TODO: implement
}

/** Persist and apply a partial settings update. */
export function applySettings(_patch: Partial<SettingsState>): void {
  // TODO: implement
}

/** Apply just the theme (also updates CSS vars). */
export function applyTheme(_theme: Theme): void {
  // TODO: implement
}
