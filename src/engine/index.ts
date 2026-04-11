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

import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';
import { MODEL_IDS, MODEL_INFO, DEFAULT_GENERATION_CONFIG, type ModelVariant } from '../config';
import type { ModelProgress, ProgressCallback } from './types';
import type { ChatMessage } from '../types';
import { logger } from '../logger';

// Module-level state
let engine: MLCEngine | null = null;
let currentModel: ModelVariant | null = null;
let loadingController: AbortController | null = null;
let isGenerating = false;

/**
 * Check if a model is already cached in IndexedDB.
 */
export function isModelCached(model: ModelVariant): Promise<boolean> {
  const modelId = MODEL_IDS[model];
  // Dynamically import to avoid bundling issues
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
export async function hasEnoughStorage(model: ModelVariant): Promise<boolean> {
  const modelInfo = MODEL_INFO[model];
  const { quota, usage } = await getStorageEstimate();
  const availableSpace = quota - usage;
  // Need at least 1.5x the model size to be safe
  return availableSpace > modelInfo.vramMB * 1.5 * 1024 * 1024;
}

/**
 * Initialize the WebLLM engine with a specific model.
 * 
 * This downloads the model if not cached, then initializes the engine.
 * Progress is reported via the callback.
 */
export async function initializeEngine(
  model: ModelVariant,
  onProgress?: ProgressCallback
): Promise<void> {
  const modelId = MODEL_IDS[model];
  const modelInfo = MODEL_INFO[model];

  // Create abort controller for potential cancellation
  loadingController = new AbortController();
  const { signal } = loadingController;

  try {
    // Create engine with progress callback
    engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report: InitProgressReport) => {
        if (signal.aborted) {
          throw new Error('Loading cancelled');
        }

        // Convert WebLLM progress to our format
        const progress: ModelProgress = {
          phase: report.text?.toLowerCase().includes('download') 
            ? 'downloading' 
            : report.text?.toLowerCase().includes('compil') 
              ? 'compiling' 
              : 'loading',
          progress: Math.round(report.progress * 100),
          message: report.text || `Loading ${modelInfo.name}...`,
          timeElapsed: report.timeElapsed,
        };

        onProgress?.(progress);
      },
    });

    currentModel = model;

    // Report completion
    onProgress?.({
      phase: 'ready',
      progress: 100,
      message: `${modelInfo.name} loaded successfully!`,
    });

  } catch (error) {
    engine = null;
    currentModel = null;
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

/**
 * Get the current engine instance.
 */
export function getEngine(): MLCEngine | null {
  return engine;
}

/**
 * Check if a model is currently loaded.
 */
export function isModelLoaded(): boolean {
  return engine !== null;
}

/**
 * Get the currently loaded model variant.
 */
export function getCurrentModel(): ModelVariant | null {
  return currentModel;
}

/**
 * Check if the engine is currently generating.
 */
export function getIsGenerating(): boolean {
  return isGenerating;
}

/**
 * Unload the engine and free memory.
 */
export async function unloadEngine(): Promise<void> {
  if (engine) {
    try {
      // WebLLM engines don't have an explicit unload method,
      // but we can clear our reference
      engine = null;
      currentModel = null;
    } catch (error) {
      logger.error('Error unloading engine:', error);
    }
  }
}

/**
 * Delete cached model data from IndexedDB.
 */
export async function deleteCachedModel(model: ModelVariant): Promise<void> {
  const modelId = MODEL_IDS[model];
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
 * 
 * @param messages - Chat history (will be converted to WebLLM format)
 * @param onToken - Callback for each token received
 * @param onComplete - Callback when generation is complete
 * @param onError - Callback for errors
 * @param options - Optional generation settings
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
