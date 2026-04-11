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
 * All Gemma 3 models require custom model records.
 * Only the 1B model has a verified WASM; others show a warning in UI.
 */
export const MODEL_IDS = {
  'gemma3-1b': 'gemma-3-1b-it-q4f16_1-MLC',
  'gemma3-4b': 'gemma-3-4b-it-q4f16_1-MLC',
  'gemma3-12b': 'gemma-3-12b-it-q4f16_1-MLC',
  'gemma3-27b': 'gemma-3-27b-it-q4f16_1-MLC',
} as const;

/**
 * Model variant type.
 */
export type ModelVariant = keyof typeof MODEL_IDS;

/**
 * Default model to load (only model with verified WASM).
 */
export const DEFAULT_MODEL: ModelVariant = 'gemma3-1b';

/**
 * Model metadata for display purposes.
 */
export const MODEL_INFO: Record<ModelVariant, { name: string; size: string; vramMB: number; hasWasm: boolean }> = {
  'gemma3-1b': {
    name: 'Gemma 3 1B',
    size: '~0.9 GB download',
    vramMB: 1200,
    hasWasm: true,
  },
  'gemma3-4b': {
    name: 'Gemma 3 4B',
    size: '~3.0 GB download',
    vramMB: 3000,
    hasWasm: false,
  },
  'gemma3-12b': {
    name: 'Gemma 3 12B',
    size: '~8.0 GB download',
    vramMB: 8000,
    hasWasm: false,
  },
  'gemma3-27b': {
    name: 'Gemma 3 27B',
    size: '~16.0 GB download',
    vramMB: 16000,
    hasWasm: false,
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
export const MEMORY_THRESHOLDS: Record<ModelVariant, number> = {
  'gemma3-1b': 2000,
  'gemma3-4b': 5000,
  'gemma3-12b': 10000,
  'gemma3-27b': 20000,
};

/**
 * Custom model records for models not in WebLLM's prebuilt config.
 *
 * Gemma 3 models require custom records. Only 1B has a working WASM;
 * other models have empty model_lib and will show a warning in UI.
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
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-4b-it-q4f16_1-MLC',
    model_id: 'gemma-3-4b-it-q4f16_1-MLC',
    model_lib: '', // WASM not yet available
    vram_required_MB: 3000,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: {
      context_window_size: 4096,
    },
  },
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-12b-it-q4f16_1-MLC',
    model_id: 'gemma-3-12b-it-q4f16_1-MLC',
    model_lib: '', // WASM not yet available
    vram_required_MB: 8000,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: {
      context_window_size: 4096,
    },
  },
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-27b-it-q4f16_1-MLC',
    model_id: 'gemma-3-27b-it-q4f16_1-MLC',
    model_lib: '', // WASM not yet available
    vram_required_MB: 16000,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: {
      context_window_size: 4096,
    },
  },
];

/**
 * Coming soon models (displayed in UI but not selectable).
 */
export const COMING_SOON_MODELS = [
  { name: 'Gemma 4 E2B', status: 'Coming Soon' },
  { name: 'Gemma 4 E4B', status: 'Coming Soon' },
];

/**
 * Model variant values for iteration.
 */
export const MODEL_VARIANTS: ModelVariant[] = ['gemma3-1b', 'gemma3-4b', 'gemma3-12b', 'gemma3-27b'];