/**
 * Transformers.js model records.
 *
 * A curated list of HuggingFace models with working ONNX/WebGPU weights
 * that can be run via @huggingface/transformers.
 * Each record supplies the metadata needed for the model catalog,
 * plus an internal `modelType` field that tells the adapter how to
 * load and run the model.
 */

import type { ModelInfo } from '../config';

/**
 * How the TransformersJsAdapter should instantiate and run a model.
 *
 * - `'text-generation'`       — loaded via `pipeline('text-generation', …)`
 * - `'conditional-generation'` — requires `AutoProcessor` + model class
 *   (e.g. Gemma4ForCausalLM) for multimodal models used in text-only mode
 */
export type TransformersModelType = 'text-generation' | 'conditional-generation';

export interface TransformersModelRecord {
  /** HuggingFace model ID (e.g. "onnx-community/Qwen2.5-0.5B-Instruct") */
  hfModelId: string;
  /** Metadata for the model catalog (runtime is always 'transformers.js') */
  info: Omit<ModelInfo, 'modelId' | 'runtime'>;
  /** How the adapter should load and run this model */
  modelType: TransformersModelType;
}

/**
 * Known-working Transformers.js models (ONNX/WebGPU).
 * ModelId for these is the HuggingFace model ID.
 */
export const TRANSFORMERS_MODEL_RECORDS: TransformersModelRecord[] = [
  {
    hfModelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    info: {
      displayName: 'Qwen 2.5 0.5B Instruct (Transformers.js)',
      family: 'qwen',
      parameterSize: '0.5B',
      quantization: 'q4',
      sizeGB: 0.4,
      vramMB: 600,
      contextWindowSize: 32768,
      recommended: false,
      tags: [],
    },
    modelType: 'text-generation',
  },
  {
    hfModelId: 'onnx-community/gemma-4-E2B-it-ONNX',
    info: {
      displayName: 'Gemma 4 E2B IT (Transformers.js)',
      family: 'gemma',
      parameterSize: '2B',
      quantization: 'q4f16',
      sizeGB: 2.0,
      vramMB: 3000,
      contextWindowSize: 131072,
      recommended: true,
      tags: ['reasoning', 'multimodal'],
    },
    modelType: 'conditional-generation',
  },
  {
    hfModelId: 'onnx-community/gemma-4-E4B-it-ONNX',
    info: {
      displayName: 'Gemma 4 E4B IT (Transformers.js)',
      family: 'gemma',
      parameterSize: '4B',
      quantization: 'q4f16',
      sizeGB: 3.5,
      vramMB: 5000,
      contextWindowSize: 131072,
      recommended: false,
      tags: ['reasoning', 'multimodal'],
    },
    modelType: 'conditional-generation',
  },
];

/** Set of HuggingFace model IDs served by TransformersJsAdapter */
export const TRANSFORMERS_MODEL_IDS = new Set(
  TRANSFORMERS_MODEL_RECORDS.map(r => r.hfModelId)
);

/**
 * Look up the model record for a given HuggingFace model ID.
 * Returns undefined if the model is not in the Transformers.js catalog.
 */
export function getTransformersModelRecord(
  hfModelId: string
): TransformersModelRecord | undefined {
  return TRANSFORMERS_MODEL_RECORDS.find(r => r.hfModelId === hfModelId);
}
