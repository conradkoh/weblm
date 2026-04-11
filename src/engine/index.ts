/**
 * Engine module — WebLLM integration and model lifecycle management.
 *
 * Responsibilities:
 * - Model loading / initialization via WebLLM
 * - Progress reporting during model download
 * - Engine instance management
 * - Chat completions with streaming
 * - Memory-aware model selection
 */

import { CreateMLCEngine, prebuiltAppConfig, type MLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';
import { getModelInfo, DEFAULT_GENERATION_CONFIG, GEMMA3_MODEL_RECORDS } from '../config';
import type { ModelProgress, ProgressCallback } from './types';
import type { ChatMessage } from '../types';
import { logger } from '../logger';

// Module-level state
let engine: MLCEngine | null = null;
let currentModelId: string | null = null;
let loadingController: AbortController | null = null;
let isGenerating = false;

/**
 * Check if a model is already cached in IndexedDB.
 */
export function isModelCached(modelId: string): Promise<boolean> {
  return import('@mlc-ai/web-llm').then(({ hasModelInCache }) =>
    hasModelInCache(modelId)
  );
}

/**
 * Get storage estimate for the browser.
 */
export async function getStorageEstimate(): Promise<{ quota: number; usage: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota ?? 0,
      usage: estimate.usage ?? 0,
    };
  }
  return { quota: 0, usage: 0 };
}

/**
 * Check if there's enough storage for a model.
 */
export async function hasEnoughStorage(modelId: string): Promise<boolean> {
  const info = getModelInfo(modelId);
  if (!info) return true; // Unknown model — optimistically allow
  const { quota, usage } = await getStorageEstimate();
  const availableSpace = quota - usage;
  // Need at least 1.5× the VRAM estimate as a proxy for download size
  return availableSpace > info.vramMB * 1.5 * 1024 * 1024;
}

/**
 * Initialize the WebLLM engine with a specific model.
 *
 * Downloads the model if not cached, then initializes the engine.
 * Progress is reported via the callback.
 */
export async function initializeEngine(
  modelId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const info = getModelInfo(modelId);
  const displayName = info?.displayName ?? modelId;

  loadingController = new AbortController();
  const { signal } = loadingController;

  try {
    engine = await CreateMLCEngine(modelId, {
      appConfig: {
        // Merge prebuilt list with Gemma 3 custom records
        model_list: [...prebuiltAppConfig.model_list, ...GEMMA3_MODEL_RECORDS],
      },
      initProgressCallback: (report: InitProgressReport) => {
        if (signal.aborted) {
          throw new Error('Loading cancelled');
        }

        const progress: ModelProgress = {
          phase: report.text?.toLowerCase().includes('download')
            ? 'downloading'
            : report.text?.toLowerCase().includes('compil')
              ? 'compiling'
              : 'loading',
          progress: Math.round(report.progress * 100),
          message: report.text || `Loading ${displayName}...`,
          timeElapsed: report.timeElapsed,
        };

        onProgress?.(progress);
      },
    });

    currentModelId = modelId;

    onProgress?.({
      phase: 'ready',
      progress: 100,
      message: `${displayName} loaded successfully!`,
    });

  } catch (error) {
    engine = null;
    currentModelId = null;
    throw error;
  } finally {
    loadingController = null;
  }
}

/**
 * Cancel the ongoing model loading.
 */
export function cancelLoading(): void {
  if (loadingController) {
    loadingController.abort();
    loadingController = null;
  }
}

/** Get the current engine instance. */
export function getEngine(): MLCEngine | null {
  return engine;
}

/** Check if a model is currently loaded. */
export function isModelLoaded(): boolean {
  return engine !== null;
}

/** Get the currently loaded model ID. */
export function getCurrentModel(): string | null {
  return currentModelId;
}

/** Check if the engine is currently generating. */
export function getIsGenerating(): boolean {
  return isGenerating;
}

/**
 * Unload the engine and free memory.
 */
export async function unloadEngine(): Promise<void> {
  if (engine) {
    try {
      engine = null;
      currentModelId = null;
    } catch (error) {
      logger.error('Error unloading engine:', error);
    }
  }
}

/**
 * Delete cached model data from IndexedDB.
 */
export async function deleteCachedModel(modelId: string): Promise<void> {
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
  await deleteModelAllInfoInCache(modelId);
}

/**
 * Convert our chat messages to WebLLM/OpenAI format.
 */
function toWebLLMMessages(messages: ChatMessage[]): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
}

/**
 * Send a message to the model and stream the response.
 */
export async function sendMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onComplete: (fullResponse: string) => void,
  onError: (error: Error) => void,
  options?: { temperature?: number; maxTokens?: number; topP?: number }
): Promise<void> {
  if (!engine) {
    onError(new Error('Model not loaded'));
    return;
  }

  if (isGenerating) {
    onError(new Error('Already generating'));
    return;
  }

  isGenerating = true;

  try {
    const stream = await engine.chat.completions.create({
      messages: toWebLLMMessages(messages),
      stream: true,
      temperature: options?.temperature ?? DEFAULT_GENERATION_CONFIG.temperature,
      max_tokens: options?.maxTokens ?? DEFAULT_GENERATION_CONFIG.maxTokens,
      top_p: options?.topP ?? DEFAULT_GENERATION_CONFIG.topP,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullResponse += delta;
        onToken(delta);
      }
    }

    onComplete(fullResponse);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Generation error:', err);
    onError(err);
  } finally {
    isGenerating = false;
  }
}

/**
 * Stop the current generation.
 */
export function stopGeneration(): void {
  if (engine && isGenerating) {
    try {
      engine.interruptGenerate();
    } catch (error) {
      logger.error('Error stopping generation:', error);
    }
    isGenerating = false;
  }
}

export type { MLCEngine, InitProgressReport };
