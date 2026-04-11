/**
 * Application configuration.
 *
 * Central configuration for:
 * - Model IDs and default settings
 * - WebLLM engineering parameters
 * - UI defaults
 * - Feature flags
 */

/**
 * WebLLM model identifiers for Gemma 4 variants.
 */
export const MODEL_IDS = {
  'gemma-4-e2b': 'gemma-4-2b-it-q4f16_1-MLC',
  'gemma-4-e4b': 'gemma-4-4b-it-q4f16_1-MLC',
} as const;

/**
 * Default model to load.
 */
export const DEFAULT_MODEL = 'gemma-4-e2b' as const;

/**
 * Default generation parameters.
 */
export const DEFAULT_GENERATION_CONFIG = {
  /** Temperature for sampling (0 = deterministic, 1 = creative) */
  temperature: 0.7,
  /** Maximum tokens to generate */
  maxTokens: 2048,
  /** Enable streaming output */
  stream: true,
  /** Top-p sampling */
  topP: 0.95,
} as const;

/**
 * Storage keys for IndexedDB.
 */
export const STORAGE_KEYS = {
  database: 'weblm-cache',
  models: 'models',
  settings: 'settings',
} as const;

/**
 * UI configuration.
 */
export const UI_CONFIG = {
  /** Auto-scroll threshold */
  autoScrollThreshold: 100,
  /** Message input max height in pixels */
  inputMaxHeight: 200,
  /** Theme preference storage key */
  themeKey: 'weblm-theme',
} as const;

/**
 * Memory thresholds for model selection (in bytes).
 */
export const MEMORY_THRESHOLDS = {
  /** Minimum memory for E2B model */
  minE2B: 3 * 1024 * 1024 * 1024, // 3GB
  /** Minimum memory for E4B model */
  minE4B: 5 * 1024 * 1024 * 1024, // 5GB
} as const;