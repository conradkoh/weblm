/**
 * Transformers.js model records.
 *
 * Starting point: a curated list of HuggingFace models with
 * working ONNX/WebGPU weights that can be run via @huggingface/transformers.
 * Each record supplies the metadata needed for the model catalog.
 */

import type { ModelInfo } from '../config';

export interface TransformersModelRecord {
  /** HuggingFace model ID (e.g. "onnx-community/Qwen2.5-0.5B-Instruct") */
  hfModelId: string;
  /** Metadata for the model catalog */
  info: Omit<ModelInfo, 'modelId'>;
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
  },
];

/** Set of HuggingFace model IDs served by TransformersJsAdapter */
export const TRANSFORMERS_MODEL_IDS = new Set(
  TRANSFORMERS_MODEL_RECORDS.map(r => r.hfModelId)
);
