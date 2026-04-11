/**
 * Storage module — cache status checking and management.
 *
 * Responsibilities:
 * - Model cache status checking for both WebLLM (IndexedDB) and Transformers.js (Cache API)
 * - Storage quota detection and management
 * - Model cache clearing utility for both runtimes
 *
 * Note: WebLLM handles the actual model caching in IndexedDB internally.
 *       Transformers.js uses the browser Cache API under the key 'transformers-cache'.
 */

import { hasModelInCache, deleteModelAllInfoInCache } from '@mlc-ai/web-llm';
import { TRANSFORMERS_MODEL_IDS } from '../engine/transformers-models';
import { logger } from '../logger';

/** The cache key used by @huggingface/transformers for model files */
const TRANSFORMERS_CACHE_KEY = 'transformers-cache';

/**
 * Check if a Transformers.js model is cached in the browser Cache API.
 * Uses a best-effort check: looks for any request matching the model ID in the cache.
 */
async function isTransformersModelCached(modelId: string): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false;
    const cache = await caches.open(TRANSFORMERS_CACHE_KEY);
    const keys = await cache.keys();
    // HF model files are stored under URLs like https://huggingface.co/{modelId}/...
    return keys.some(req => req.url.includes(modelId));
  } catch {
    return false;
  }
}

/**
 * Delete Transformers.js model files from the browser Cache API.
 */
async function deleteTransformersModelCache(modelId: string): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(TRANSFORMERS_CACHE_KEY);
    const keys = await cache.keys();
    const matching = keys.filter(req => req.url.includes(modelId));
    await Promise.all(matching.map(req => cache.delete(req)));
    logger.info(`Deleted ${matching.length} cache entries for ${modelId}`);
  } catch (error) {
    logger.error('Error clearing Transformers.js model cache:', error);
    throw error;
  }
}

/**
 * Check if a model is already cached (runtime-aware).
 * - WebLLM models: checks IndexedDB via hasModelInCache
 * - Transformers.js models: checks browser Cache API
 */
export async function checkModelCached(modelId: string): Promise<boolean> {
  if (TRANSFORMERS_MODEL_IDS.has(modelId)) {
    return isTransformersModelCached(modelId);
  }
  try {
    return await hasModelInCache(modelId);
  } catch (error) {
    logger.error('Error checking model cache:', error);
    return false;
  }
}

/**
 * Clear a cached model (runtime-aware).
 * - WebLLM models: deletes from IndexedDB
 * - Transformers.js models: deletes from browser Cache API
 */
export async function clearCachedModel(modelId: string): Promise<void> {
  if (TRANSFORMERS_MODEL_IDS.has(modelId)) {
    return deleteTransformersModelCache(modelId);
  }
  try {
    await deleteModelAllInfoInCache(modelId);
  } catch (error) {
    logger.error('Error clearing model cache:', error);
    throw error;
  }
}

/**
 * Get storage quota and usage estimates.
 */
export async function getStorageEstimate(): Promise<{
  quota: number;
  usage: number;
  available: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota ?? 0;
    const usage = estimate.usage ?? 0;
    return {
      quota,
      usage,
      available: quota - usage,
    };
  }
  return { quota: 0, usage: 0, available: 0 };
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Get storage status message for display.
 */
export async function getStorageStatus(): Promise<string> {
  const { quota, usage, available } = await getStorageEstimate();
  return `Storage: ${formatBytes(usage)} used of ${formatBytes(quota)} (${formatBytes(available)} available)`;
}
