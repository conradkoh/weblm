/**
 * Storage module — IndexedDB persistence layer.
 *
 * Responsibilities:
 * - Model cache status checking
 * - Storage quota detection and management
 * - Model cache clearing utility
 * 
 * Note: WebLLM handles the actual model caching in IndexedDB internally.
 * We just provide convenience wrappers here.
 */

import { hasModelInCache, deleteModelAllInfoInCache } from '@mlc-ai/web-llm';
import { MODEL_IDS, type ModelVariant } from '../config';
import { logger } from '../logger';

/**
 * Check if a model is already cached in IndexedDB.
 */
export async function checkModelCached(model: ModelVariant): Promise<boolean> {
  const modelId = MODEL_IDS[model];
  try {
    return await hasModelInCache(modelId);
  } catch (error) {
    logger.error('Error checking model cache:', error);
    return false;
  }
}

/**
 * Clear a cached model from IndexedDB.
 */
export async function clearCachedModel(model: ModelVariant): Promise<void> {
  const modelId = MODEL_IDS[model];
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
