/**
 * Engine module — public API for model lifecycle and chat.
 *
 * All inference is delegated to the singleton LLMEngine from engine-factory.
 * Callers do not need to know which runtime is active.
 *
 * Standalone utilities (WebLLM-specific cache helpers) are also re-exported here.
 */

import { prebuiltAppConfig, type MLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';
import { getModelInfo } from '../config';
import { getEngineInstance, switchRuntimeForModel } from './engine-factory';
import { WebLLMAdapter } from './webllm-adapter';
import type { ProgressCallback } from './types';
import type { ChatMessage } from '../types';
import { logger } from '../logger';

// ─── Cache utilities (WebLLM-specific, not part of LLMEngine) ─

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
  if (!info) return true;
  const { quota, usage } = await getStorageEstimate();
  const availableSpace = quota - usage;
  return availableSpace > info.vramMB * 1.5 * 1024 * 1024;
}

/**
 * Delete cached model data from IndexedDB.
 */
export async function deleteCachedModel(modelId: string): Promise<void> {
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
  await deleteModelAllInfoInCache(modelId);
}

// ─── Engine lifecycle delegates ──────────────────────────────

/**
 * Initialize the engine with a specific model.
 * Auto-detects runtime based on modelId and switches the singleton if needed.
 */
export async function initializeEngine(
  modelId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  switchRuntimeForModel(modelId);
  return getEngineInstance().initialize(modelId, onProgress);
}

/**
 * Cancel the ongoing model loading (WebLLMAdapter-specific).
 */
export function cancelLoading(): void {
  const eng = getEngineInstance();
  if (eng instanceof WebLLMAdapter) {
    eng.cancelLoading();
  }
}

/**
 * Get the raw MLCEngine instance (WebLLMAdapter-specific, used by callers that need it).
 */
export function getEngine(): MLCEngine | null {
  // Kept for backward compatibility — callers that typed against MLCEngine directly.
  // Returns null when a non-WebLLM adapter is active.
  return null;
}

/**
 * Check if a model is currently loaded.
 */
export function isModelLoaded(): boolean {
  return getEngineInstance().isModelLoaded();
}

/**
 * Get the currently loaded model ID.
 */
export function getCurrentModel(): string | null {
  return getEngineInstance().getCurrentModelId();
}

/**
 * Check if the engine is currently generating.
 */
export function getIsGenerating(): boolean {
  return getEngineInstance().isGenerating();
}

/**
 * Unload the engine and free memory.
 */
export async function unloadEngine(): Promise<void> {
  return getEngineInstance().unload();
}

// ─── Chat ─────────────────────────────────────────────────────

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
  return getEngineInstance().sendMessage(messages, onToken, onComplete, onError, options);
}

/**
 * Stop the current generation.
 */
export function stopGeneration(): void {
  getEngineInstance().stopGeneration();
}

export type { MLCEngine, InitProgressReport };
