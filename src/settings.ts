/**
 * Settings persistence and management.
 *
 * Handles:
 * - Generation parameters (temperature, max_tokens, top_p)
 * - System prompt
 * - Theme preference
 * - Export/Import settings
 */

import { DEFAULT_GENERATION_CONFIG } from './config';

/** Storage keys for localStorage */
const STORAGE_KEYS = {
  temperature: 'weblm-temperature',
  maxTokens: 'weblm-max-tokens',
  topP: 'weblm-top-p',
  systemPrompt: 'weblm-system-prompt',
  theme: 'weblm-theme',
  showMetrics: 'weblm-show-metrics',
} as const;

/** Theme type */
export type Theme = 'light' | 'dark' | 'system';

/** Settings type */
export interface AppSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  theme: Theme;
  showMetrics: boolean;
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  temperature: DEFAULT_GENERATION_CONFIG.temperature,
  maxTokens: DEFAULT_GENERATION_CONFIG.maxTokens,
  topP: DEFAULT_GENERATION_CONFIG.topP,
  systemPrompt: 'You are a helpful AI assistant.',
  theme: 'system',
  showMetrics: false,
};

/**
 * Get a setting from localStorage.
 */
function getSetting<T>(key: string, defaultValue: T, parser: (val: string) => T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return parser(stored);
  } catch {
    return defaultValue;
  }
}

/**
 * Save a setting to localStorage.
 */
function setSetting<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.error(`[weblm] Failed to save setting ${key}:`, error);
  }
}

/**
 * Load all settings from localStorage.
 */
export function loadSettings(): AppSettings {
  return {
    temperature: getSetting(STORAGE_KEYS.temperature, DEFAULT_SETTINGS.temperature, parseFloat),
    maxTokens: getSetting(STORAGE_KEYS.maxTokens, DEFAULT_SETTINGS.maxTokens, parseInt),
    topP: getSetting(STORAGE_KEYS.topP, DEFAULT_SETTINGS.topP, parseFloat),
    systemPrompt: getSetting(STORAGE_KEYS.systemPrompt, DEFAULT_SETTINGS.systemPrompt, String),
    theme: getSetting(STORAGE_KEYS.theme, DEFAULT_SETTINGS.theme, String as (val: string) => Theme),
    showMetrics: getSetting(STORAGE_KEYS.showMetrics, DEFAULT_SETTINGS.showMetrics, (val) => val === 'true'),
  };
}

/**
 * Save all settings to localStorage.
 */
export function saveSettings(settings: Partial<AppSettings>): void {
  if (settings.temperature !== undefined) {
    setSetting(STORAGE_KEYS.temperature, settings.temperature);
  }
  if (settings.maxTokens !== undefined) {
    setSetting(STORAGE_KEYS.maxTokens, settings.maxTokens);
  }
  if (settings.topP !== undefined) {
    setSetting(STORAGE_KEYS.topP, settings.topP);
  }
  if (settings.systemPrompt !== undefined) {
    setSetting(STORAGE_KEYS.systemPrompt, settings.systemPrompt);
  }
  if (settings.theme !== undefined) {
    setSetting(STORAGE_KEYS.theme, settings.theme);
  }
  if (settings.showMetrics !== undefined) {
    setSetting(STORAGE_KEYS.showMetrics, settings.showMetrics);
  }
}

/**
 * Reset settings to defaults.
 */
export function resetSettings(): void {
  saveSettings(DEFAULT_SETTINGS);
}

/**
 * Get temperature setting.
 */
export function getTemperature(): number {
  return getSetting(STORAGE_KEYS.temperature, DEFAULT_SETTINGS.temperature, parseFloat);
}

/**
 * Set temperature setting.
 */
export function setTemperature(value: number): void {
  setSetting(STORAGE_KEYS.temperature, value);
}

/**
 * Get max tokens setting.
 */
export function getMaxTokens(): number {
  return getSetting(STORAGE_KEYS.maxTokens, DEFAULT_SETTINGS.maxTokens, parseInt);
}

/**
 * Set max tokens setting.
 */
export function setMaxTokens(value: number): void {
  setSetting(STORAGE_KEYS.maxTokens, value);
}

/**
 * Get top-p setting.
 */
export function getTopP(): number {
  return getSetting(STORAGE_KEYS.topP, DEFAULT_SETTINGS.topP, parseFloat);
}

/**
 * Set top-p setting.
 */
export function setTopP(value: number): void {
  setSetting(STORAGE_KEYS.topP, value);
}

/**
 * Get system prompt setting.
 */
export function getSystemPrompt(): string {
  return getSetting(STORAGE_KEYS.systemPrompt, DEFAULT_SETTINGS.systemPrompt, String);
}

/**
 * Set system prompt setting.
 */
export function setSystemPrompt(value: string): void {
  setSetting(STORAGE_KEYS.systemPrompt, value);
}

/**
 * Get theme setting.
 */
export function getTheme(): Theme {
  return getSetting(STORAGE_KEYS.theme, DEFAULT_SETTINGS.theme, String as (val: string) => Theme);
}

/**
 * Set theme setting.
 */
export function setTheme(value: Theme): void {
  setSetting(STORAGE_KEYS.theme, value);
}

/**
 * Get the effective theme (resolving 'system').
 */
export function getEffectiveTheme(): 'light' | 'dark' {
  const theme = getTheme();
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Get show metrics setting.
 */
export function getShowMetrics(): boolean {
  return getSetting(STORAGE_KEYS.showMetrics, DEFAULT_SETTINGS.showMetrics, (val) => val === 'true');
}

/**
 * Set show metrics setting.
 */
export function setShowMetrics(value: boolean): void {
  setSetting(STORAGE_KEYS.showMetrics, value);
}