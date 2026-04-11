/**
 * Application configuration.
 *
 * Central configuration for:
 * - Model IDs and default settings
 * - WebLLM engineering parameters
 * - UI defaults
 * - Feature flags
 */

import type { ModelRecord } from '@mlc-ai/web-llm';

/**
 * Available model variants with their WebLLM model IDs.
 *
 * - small: Gemma 3 1B (custom model config)
 * - large: Gemma 2 9B (prebuilt config)
 */
export const MODEL_IDS = {
  small: 'gemma-3-1b-it-q4f16_1-MLC',
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
    name: 'Gemma 3 1B (Quantized)',
    size: '~0.9 GB download',
    vramMB: 1200,
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

/**
 * Custom model records for models not in WebLLM's prebuilt config.
 *
 * Gemma 3 1B requires a custom model record because it's not yet in the prebuilt config.
 */
export const CUSTOM_MODEL_RECORDS: ModelRecord[] = [
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-1b-it-q4f16_1-MLC',
    model_id: 'gemma-3-1b-it-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/gemma-3-1b-it-q4f16_1-ctx4k_cs1k-webgpu.wasm',
    vram_required_MB: 1200,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: {
      context_window_size: 4096,
    },
  },
];