/**
 * Settings store — reactive wrapper around src/settings.ts.
 *
 * Provides reactive state for all user-configurable settings.
 * The underlying src/settings.ts module handles localStorage persistence.
 * This store adds Svelte 5 reactivity on top.
 */

import type { SettingsState, Theme } from './types';
import {
  loadSettings,
  saveSettings,
  resetSettings as resetSettingsStorage,
  setTemperature as persistTemperature,
  setMaxTokens as persistMaxTokens,
  setTopP as persistTopP,
  setSystemPrompt as persistSystemPrompt,
  setTheme as persistTheme,
  setShowMetrics as persistShowMetrics,
} from '../settings';
import { applyThemeByName } from '../lib/themes';

// ─── State ────────────────────────────────────────────────────

const _saved = loadSettings();
const _state = $state<SettingsState>({
  temperature: _saved.temperature,
  maxTokens: _saved.maxTokens,
  topP: _saved.topP,
  systemPrompt: _saved.systemPrompt,
  theme: _saved.theme,
  showMetrics: _saved.showMetrics,
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive settings state. */
export function getSettingsState(): SettingsState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

/** Load settings from localStorage into the reactive store (call on init). */
export function loadSettingsIntoStore(): void {
  const saved = loadSettings();
  _state.temperature = saved.temperature;
  _state.maxTokens = saved.maxTokens;
  _state.topP = saved.topP;
  _state.systemPrompt = saved.systemPrompt;
  _state.theme = saved.theme;
  _state.showMetrics = saved.showMetrics;
}

/** Apply a partial settings update to both reactive state and localStorage. */
export function applySettings(patch: Partial<SettingsState>): void {
  if (patch.temperature !== undefined) {
    _state.temperature = patch.temperature;
    persistTemperature(patch.temperature);
  }
  if (patch.maxTokens !== undefined) {
    _state.maxTokens = patch.maxTokens;
    persistMaxTokens(patch.maxTokens);
  }
  if (patch.topP !== undefined) {
    _state.topP = patch.topP;
    persistTopP(patch.topP);
  }
  if (patch.systemPrompt !== undefined) {
    _state.systemPrompt = patch.systemPrompt;
    persistSystemPrompt(patch.systemPrompt);
  }
  if (patch.theme !== undefined) {
    _state.theme = patch.theme;
    persistTheme(patch.theme);
    applyThemeByName(patch.theme);
  }
  if (patch.showMetrics !== undefined) {
    _state.showMetrics = patch.showMetrics;
    persistShowMetrics(patch.showMetrics);
  }
}

/** Apply just the theme (updates reactive state, persists, and updates CSS vars). */
export function applyTheme(theme: Theme): void {
  _state.theme = theme;
  persistTheme(theme);
  applyThemeByName(theme);
}

/** Reset settings to defaults (both state and localStorage). */
export function resetSettings(): void {
  resetSettingsStorage();
  loadSettingsIntoStore();
  applyThemeByName(_state.theme);
}
