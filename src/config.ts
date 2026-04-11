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
 * Available model variants with their WebLLM model IDs.
 * 
 * Note: Using Gemma 2 models as Gemma 4 is not yet available in WebLLM's prebuilt config.
 */
export const MODEL_IDS = {
  small: 'gemma-2-2b-it-q4f16_1-MLC',
  large: 'gemma-2-9b-it-q4f16_1-MLC',
} as const;

/**
 * Model variant type.
 */
export type ModelVariant = keyof typeof MODEL_IDS;

/**
 * Default model to load (smaller model recommended for most users).
 */
export const DEFAULT_MODEL: ModelVariant = 'small';

/**
 * Model metadata for display purposes.
 */
export const MODEL_INFO: Record<ModelVariant, { name: string; size: string; vramMB: number }> = {
  small: {
    name: 'Gemma 2 2B (Quantized)',
    size: '~1.9 GB download',
    vramMB: 1900,
  },
  large: {
    name: 'Gemma 2 9B (Quantized)',
    size: '~6.4 GB download',
    vramMB: 6400,
  },
};

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
 * Memory thresholds for model selection (in MB).
 */
export const MEMORY_THRESHOLDS = {
  /** Minimum available memory for small model */
  minSmall: 3000, // 3GB
  /** Minimum available memory for large model */
  minLarge: 8000, // 8GB
} as const;