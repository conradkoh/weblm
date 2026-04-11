/**
 * Application configuration.
 *
 * Central configuration for:
 * - Model catalog built from WebLLM's prebuiltAppConfig
 * - Model families, metadata, and recommendations
 * - Generation defaults and UI config
 */

import { prebuiltAppConfig, type ModelRecord } from '@mlc-ai/web-llm';
import { TRANSFORMERS_MODEL_RECORDS } from './engine/transformers-models';

// ─────────────────────────────────────────────────────────────
// Model families
// ─────────────────────────────────────────────────────────────

/**
 * A family of related models for grouping in the UI.
 */
export interface ModelFamily {
  id: string;
  name: string;
  description: string;
}

export const MODEL_FAMILIES: ModelFamily[] = [
  { id: 'qwen',     name: 'Qwen',     description: 'Alibaba — strong multilingual & coding' },
  { id: 'llama',    name: 'Llama',    description: 'Meta — versatile general-purpose' },
  { id: 'gemma',    name: 'Gemma',    description: 'Google — efficient & lightweight' },
  { id: 'phi',      name: 'Phi',      description: 'Microsoft — compact & capable' },
  { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek — reasoning focused' },
  { id: 'mistral',  name: 'Mistral',  description: 'Mistral AI — efficient European LLM' },
  { id: 'smollm',   name: 'SmolLM',   description: 'HuggingFace — tiny & fast' },
  { id: 'other',    name: 'Other',    description: 'Additional models' },
];

// ─────────────────────────────────────────────────────────────
// Model info
// ─────────────────────────────────────────────────────────────

/**
 * Extended model metadata on top of WebLLM's ModelRecord.
 */
export interface ModelInfo {
  /** WebLLM model_id or HuggingFace model ID (used as the canonical key) */
  modelId: string;
  /** Human-friendly name, e.g. "Llama 3.2 3B Instruct" */
  displayName: string;
  /** References ModelFamily.id */
  family: string;
  /** Parameter count string, e.g. "1B", "3B", "7B" */
  parameterSize: string;
  /** Quantization level, e.g. "q4f16_1" */
  quantization: string;
  /** Approximate download size in GB (estimated from vramMB) */
  sizeGB: number;
  /** VRAM required in MB (from WebLLM record) */
  vramMB: number;
  /** Context window size in tokens */
  contextWindowSize: number;
  /** Inference backend to use for this model */
  runtime: 'webllm' | 'transformers.js';
  /** Highlighted as a top recommendation in the UI */
  recommended?: boolean;
  /** Capability tags, e.g. ['coding', 'math', 'reasoning', 'vision'] */
  tags?: string[];
}

// ─────────────────────────────────────────────────────────────
// Curated metadata overrides
// ─────────────────────────────────────────────────────────────

/**
 * Partial curated metadata keyed by modelId.
 * Overrides auto-detected values for specific models.
 */
const CURATED: Record<string, Partial<ModelInfo>> = {
  // ── Recommended picks ──────────────────────────────────────
  'Qwen3-4B-q4f16_1-MLC':                    { recommended: true },
  'Llama-3.2-3B-Instruct-q4f16_1-MLC':       { recommended: true },
  'gemma-2-2b-it-q4f16_1-MLC':               { recommended: true, displayName: 'Gemma 2 2B IT (q4f16)' },
  'Phi-3.5-mini-instruct-q4f16_1-MLC':       { recommended: true },
  'SmolLM2-1.7B-Instruct-q4f16_1-MLC':       { recommended: true },
  'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC': { recommended: true, tags: ['reasoning'] },

  // ── Capability tags ────────────────────────────────────────
  'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC':  { tags: ['coding'] },
  'Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC':  { tags: ['coding'] },
  'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC':  { tags: ['coding'] },
  'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC':  { tags: ['coding'] },
  'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC':    { tags: ['coding'] },
  'Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC':    { tags: ['coding'] },
  'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC':    { tags: ['coding'] },
  'Qwen2.5-Coder-7B-Instruct-q4f32_1-MLC':    { tags: ['coding'] },
  'Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC':   { tags: ['math'] },
  'Qwen2.5-Math-1.5B-Instruct-q4f32_1-MLC':   { tags: ['math'] },
  'Qwen2-Math-1.5B-Instruct-q4f16_1-MLC':     { tags: ['math'] },
  'Qwen2-Math-1.5B-Instruct-q4f32_1-MLC':     { tags: ['math'] },
  'Qwen2-Math-7B-Instruct-q4f16_1-MLC':       { tags: ['math'] },
  'Qwen2-Math-7B-Instruct-q4f32_1-MLC':       { tags: ['math'] },
  'WizardMath-7B-V1.1-q4f16_1-MLC':           { tags: ['math'] },
  'DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC':  { tags: ['reasoning'] },
  'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC': { tags: ['reasoning'] },
  'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC': { tags: ['reasoning'] },
  'Ministral-3-3B-Reasoning-2512-q4f16_1-MLC':      { displayName: 'Ministral 3 3B Reasoning (q4f16)', tags: ['reasoning'] },
  'Phi-3.5-vision-instruct-q4f16_1-MLC':      { tags: ['vision'] },
  'Phi-3.5-vision-instruct-q4f32_1-MLC':      { tags: ['vision'] },

  // ── Friendly display name overrides ───────────────────────
  'gemma-2b-it-q4f16_1-MLC': { displayName: 'Gemma 1 2B IT (q4f16)' },
  'gemma-2b-it-q4f32_1-MLC': { displayName: 'Gemma 1 2B IT (q4f32)' },
  'gemma-2-2b-it-q4f32_1-MLC': { displayName: 'Gemma 2 2B IT (q4f32)' },
  'gemma-2-9b-it-q4f16_1-MLC': { displayName: 'Gemma 2 9B IT (q4f16)' },
  'gemma-2-9b-it-q4f32_1-MLC': { displayName: 'Gemma 2 9B IT (q4f32)' },
  'stablelm-2-zephyr-1_6b-q4f16_1-MLC': { displayName: 'StableLM 2 Zephyr 1.6B (q4f16)' },
  'stablelm-2-zephyr-1_6b-q4f32_1-MLC': { displayName: 'StableLM 2 Zephyr 1.6B (q4f32)' },
  'Ministral-3-3B-Base-2512-q4f16_1-MLC': { displayName: 'Ministral 3 3B Base (q4f16)' },
  'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC': { displayName: 'Ministral 3 3B Instruct BF16 (q4f16)' },
};

// ─────────────────────────────────────────────────────────────
// Auto-detection helpers
// ─────────────────────────────────────────────────────────────

/**
 * Detect model family from model_id.
 */
function detectFamily(modelId: string): string {
  // For HuggingFace IDs like "onnx-community/Qwen2.5-0.5B-Instruct", use the repo name part
  const name = modelId.includes('/') ? modelId.split('/').pop()! : modelId;
  const id = name.toLowerCase();
  if (id.includes('deepseek'))     return 'deepseek';
  if (id.includes('smollm'))       return 'smollm';
  if (id.includes('qwen'))         return 'qwen';
  if (id.startsWith('llama') || id.startsWith('tinyllama') || id.includes('hermes')) return 'llama';
  if (id.includes('gemma'))        return 'gemma';
  if (id.includes('phi'))          return 'phi';
  if (id.includes('mistral') || id.includes('ministral') || id.includes('wizard') || id.includes('openhermes') || id.includes('neuralhermes')) return 'mistral';
  return 'other';
}

/**
 * Extract quantization string from model_id (e.g. "q4f16_1").
 */
function extractQuantization(modelId: string): string {
  const match = modelId.match(/q\d+f\d+(?:_\d+)?/i);
  return match ? match[0] : '';
}

/**
 * Extract parameter size from model_id (e.g. "1B", "7B", "0.5B").
 */
function extractParamSize(modelId: string): string {
  // Match patterns like 0.5B, 1B, 1.1B, 1.5B, 1.6b, 1.7B, 2B, 3B, 4B, 7B, 8B, 9B, 13B, 70B
  const match = modelId.match(/(\d+(?:\.\d+)?)[Bb](?!it)/);
  return match ? `${match[1]}B` : '';
}

/**
 * Auto-generate a display name from model_id.
 */
function autoDisplayName(modelId: string): string {
  // Strip -MLC suffix
  let name = modelId.replace(/-MLC$/, '');

  // Extract and format quantization
  const quant = extractQuantization(name);
  if (quant) {
    // Remove quantization from the name body
    name = name.replace(`-${quant}`, '');
    // Format: "Model Name (q4f16)"
    // Simplify: remove _1 suffix from quantization label
    const quantLabel = quant.replace(/_\d+$/, '');
    name = `${name} (${quantLabel})`;
  }

  // Replace hyphens/underscores with spaces
  name = name.replace(/[-_]/g, ' ');

  // Capitalize first letter of each "word segment" that doesn't look like a version
  name = name
    .split(' ')
    .map(word => {
      // Capitalize first letter if it starts with a letter
      if (/^[a-z]/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');

  return name;
}

/**
 * Estimate download size in GB from VRAM MB.
 * Rough heuristic: download ≈ 0.65× VRAM.
 */
function estimateSizeGB(vramMB: number): number {
  if (!vramMB) return 0;
  return Math.round((vramMB * 0.65) / 1024 * 10) / 10;
}

// ─────────────────────────────────────────────────────────────
// Gemma 3 custom model records (not in prebuiltAppConfig)
// ─────────────────────────────────────────────────────────────

/**
 * Custom ModelRecords for Gemma 3 models that aren't in WebLLM's prebuilt config.
 * Only gemma3-1b has a working WASM; others have empty model_lib and will fail at load time.
 */
export const GEMMA3_MODEL_RECORDS: ModelRecord[] = [
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-1b-it-q4f16_1-MLC',
    model_id: 'gemma-3-1b-it-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/gemma-3-1b-it-q4f16_1-ctx4k_cs1k-webgpu.wasm',
    vram_required_MB: 1200,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: { context_window_size: 4096 },
  },
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-4b-it-q4f16_1-MLC',
    model_id: 'gemma-3-4b-it-q4f16_1-MLC',
    model_lib: '', // WASM not yet available
    vram_required_MB: 3000,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: { context_window_size: 4096 },
  },
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-12b-it-q4f16_1-MLC',
    model_id: 'gemma-3-12b-it-q4f16_1-MLC',
    model_lib: '', // WASM not yet available
    vram_required_MB: 8000,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: { context_window_size: 4096 },
  },
  {
    model: 'https://huggingface.co/mlc-ai/gemma-3-27b-it-q4f16_1-MLC',
    model_id: 'gemma-3-27b-it-q4f16_1-MLC',
    model_lib: '', // WASM not yet available
    vram_required_MB: 16000,
    low_resource_required: false,
    required_features: ['shader-f16'],
    overrides: { context_window_size: 4096 },
  },
];

/** Curated metadata for Gemma 3 custom models */
const GEMMA3_CURATED: Record<string, Partial<ModelInfo>> = {
  'gemma-3-1b-it-q4f16_1-MLC': {
    displayName: 'Gemma 3 1B IT (q4f16)',
    family: 'gemma',
    parameterSize: '1B',
    quantization: 'q4f16_1',
    contextWindowSize: 4096,
    runtime: 'webllm' as const,
    recommended: true,
    tags: [],
  },
  'gemma-3-4b-it-q4f16_1-MLC': {
    displayName: 'Gemma 3 4B IT (q4f16) ⚠️ WASM pending',
    family: 'gemma',
    parameterSize: '4B',
    quantization: 'q4f16_1',
    contextWindowSize: 4096,
    runtime: 'webllm' as const,
    tags: [],
  },
  'gemma-3-12b-it-q4f16_1-MLC': {
    displayName: 'Gemma 3 12B IT (q4f16) ⚠️ WASM pending',
    family: 'gemma',
    parameterSize: '12B',
    quantization: 'q4f16_1',
    contextWindowSize: 4096,
    runtime: 'webllm' as const,
    tags: [],
  },
  'gemma-3-27b-it-q4f16_1-MLC': {
    displayName: 'Gemma 3 27B IT (q4f16) ⚠️ WASM pending',
    family: 'gemma',
    parameterSize: '27B',
    quantization: 'q4f16_1',
    contextWindowSize: 4096,
    runtime: 'webllm' as const,
    tags: [],
  },
};

// ─────────────────────────────────────────────────────────────
// Model catalog builder
// ─────────────────────────────────────────────────────────────

/**
 * Check whether a ModelRecord should be excluded from the catalog.
 * Excludes: embedding models, -1k context variants.
 */
function shouldExclude(record: ModelRecord): boolean {
  const id = record.model_id;
  // Skip embedding models
  if ((record as { model_type?: string }).model_type === 'embedding') return true;
  if (id.toLowerCase().includes('embed')) return true;
  // Skip -1k context variants (low-resource variants of the same model)
  if (id.endsWith('-1k')) return true;
  if (id.includes('-1k-')) return true;
  return false;
}

/**
 * Build a ModelInfo from a WebLLM ModelRecord + optional curated overrides.
 */
function buildModelInfo(
  record: ModelRecord,
  curated?: Partial<ModelInfo>,
  runtime: 'webllm' | 'transformers.js' = 'webllm'
): ModelInfo {
  const modelId = record.model_id;
  const vramMB = record.vram_required_MB ?? 0;
  const contextWindowSize = (record.overrides as { context_window_size?: number } | undefined)?.context_window_size ?? 4096;

  const auto: ModelInfo = {
    modelId,
    displayName:       autoDisplayName(modelId),
    family:            detectFamily(modelId),
    parameterSize:     extractParamSize(modelId),
    quantization:      extractQuantization(modelId),
    sizeGB:            estimateSizeGB(vramMB),
    vramMB,
    contextWindowSize,
    runtime,
  };

  return { ...auto, ...CURATED[modelId], ...curated };
}

/**
 * The full model catalog, built lazily once at module load.
 * Includes all prebuilt WebLLM models (filtered) + Gemma 3 custom models.
 */
let _catalog: ModelInfo[] | null = null;

function buildCatalog(): ModelInfo[] {
  const catalog: ModelInfo[] = [];

  // Add all prebuilt WebLLM models (filtered)
  for (const record of prebuiltAppConfig.model_list) {
    if (!shouldExclude(record)) {
      catalog.push(buildModelInfo(record, undefined, 'webllm'));
    }
  }

  // Add Gemma 3 custom WebLLM models
  for (const record of GEMMA3_MODEL_RECORDS) {
    catalog.push(buildModelInfo(record, GEMMA3_CURATED[record.model_id], 'webllm'));
  }

  // Add Transformers.js models
  for (const rec of TRANSFORMERS_MODEL_RECORDS) {
    const info: ModelInfo = {
      modelId: rec.hfModelId,
      ...rec.info,
      runtime: 'transformers.js',
    };
    catalog.push(info);
  }

  return catalog;
}

function getCatalog(): ModelInfo[] {
  if (!_catalog) {
    _catalog = buildCatalog();
  }
  return _catalog;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/** Get all models in the catalog */
export function getModelCatalog(): ModelInfo[] {
  return getCatalog();
}

/** Get models grouped by family (families ordered per MODEL_FAMILIES) */
export function getModelsByFamily(): Map<string, ModelInfo[]> {
  const map = new Map<string, ModelInfo[]>();
  // Initialise in family order so iteration is predictable
  for (const family of MODEL_FAMILIES) {
    map.set(family.id, []);
  }
  for (const model of getCatalog()) {
    const bucket = map.get(model.family) ?? map.get('other')!;
    bucket.push(model);
  }
  // Remove empty families
  for (const [key, val] of map) {
    if (val.length === 0) map.delete(key);
  }
  return map;
}

/** Get recommended models */
export function getRecommendedModels(): ModelInfo[] {
  return getCatalog().filter(m => m.recommended);
}

/** Get a specific model's info by modelId */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return getCatalog().find(m => m.modelId === modelId);
}

/** Get the WebLLM ModelRecord for a model (from prebuilt config or Gemma 3 custom) */
export function getModelRecord(modelId: string): ModelRecord | undefined {
  const prebuilt = prebuiltAppConfig.model_list.find(r => r.model_id === modelId);
  if (prebuilt) return prebuilt;
  return GEMMA3_MODEL_RECORDS.find(r => r.model_id === modelId);
}

/** Default model to load on first run */
export const DEFAULT_MODEL_ID = 'Qwen3-4B-q4f16_1-MLC';

// ─────────────────────────────────────────────────────────────
// Generation config
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Storage / UI config
// ─────────────────────────────────────────────────────────────

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
