/**
 * Error recovery and handling for WebLLM engine.
 *
 * Responsibilities:
 * - Categorize errors (OOM, device lost, network, unknown)
 * - Attempt automatic recovery from transient errors
 * - Track error counts for model recommendations
 * - Provide user-friendly error messages
 */

import { getModelInfo, getModelCatalog } from '../config';
import { logger } from '../logger';

/** Error categories */
export type ErrorCategory = 'oom' | 'device-lost' | 'network' | 'validation' | 'unknown';

/** Error recovery result */
export interface RecoveryResult {
  success: boolean;
  message: string;
  shouldSwitchModel?: boolean;
  recommendedModel?: string;
}

/** Error context for tracking */
interface ErrorContext {
  count: number;
  lastError: string;
  lastCategory: ErrorCategory;
  timestamp: number;
}

/** Tracked errors for auto-recovery decisions */
const errorHistory: ErrorContext[] = [];

/** Maximum retry attempts before recommending model switch */
const MAX_RETRIES = 3;

/**
 * Get the next smaller model for fallback.
 * Prefers same family; falls back across families.
 * Returns null if the current model is already the smallest available.
 */
function getSmallerModel(modelId: string): string | null {
  const current = getModelInfo(modelId);
  if (!current) return null;

  const catalog = getModelCatalog();

  // Find models with strictly less VRAM, sorted descending (largest first so we pick closest fit)
  const candidates = catalog
    .filter(m => m.vramMB > 0 && m.vramMB < current.vramMB)
    .sort((a, b) => b.vramMB - a.vramMB);

  if (candidates.length === 0) return null;

  // Prefer same family
  const sameFamilyCandidate = candidates.find(m => m.family === current.family);
  return (sameFamilyCandidate ?? candidates[0])!.modelId;
}

/**
 * Categorize an error based on its message/type.
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name?.toLowerCase() || '';

  if (
    message.includes('out of memory') ||
    message.includes('oom') ||
    message.includes('memory allocation failed') ||
    message.includes('not enough memory') ||
    name.includes('outofmemory')
  ) {
    return 'oom';
  }

  if (
    message.includes('device lost') ||
    message.includes('device was lost') ||
    message.includes('gpu crashed') ||
    message.includes('webgpu device lost') ||
    message.includes('context lost')
  ) {
    return 'device-lost';
  }

  if (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('download failed') ||
    message.includes('connection') ||
    name.includes('networkerror')
  ) {
    return 'network';
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('unsupported') ||
    name.includes('validationerror')
  ) {
    return 'validation';
  }

  return 'unknown';
}

/**
 * Get a user-friendly error message.
 */
export function getErrorMessage(category: ErrorCategory, originalError: Error): string {
  switch (category) {
    case 'oom':
      return 'Not enough memory. Try closing other browser tabs or switching to a smaller model.';
    case 'device-lost':
      return 'The GPU encountered an error. This usually happens when the browser or system runs low on resources. Try refreshing the page.';
    case 'network':
      return 'A network error occurred while loading the model. Check your internet connection and try again.';
    case 'validation':
      return `An invalid operation was requested: ${originalError.message}`;
    default:
      return `An unexpected error occurred: ${originalError.message}`;
  }
}

/**
 * Track an error for auto-recovery decisions.
 */
export function trackError(category: ErrorCategory, error: Error): void {
  const timestamp = Date.now();
  errorHistory.push({
    count: errorHistory.length + 1,
    lastError: error.message,
    lastCategory: category,
    timestamp,
  });

  if (errorHistory.length > 10) {
    errorHistory.shift();
  }

  logger.warn(`Error tracked (${category}):`, error.message);
}

/**
 * Get recent error count for a category.
 */
export function getRecentErrorCount(category: ErrorCategory, withinMs: number = 60000): number {
  const now = Date.now();
  return errorHistory.filter(
    e => e.lastCategory === category && (now - e.timestamp) < withinMs
  ).length;
}

/**
 * Determine if automatic recovery is possible.
 */
export function canAutoRecover(category: ErrorCategory, currentModelId: string): boolean {
  const recentCount = getRecentErrorCount(category);

  if (category === 'device-lost' && recentCount < MAX_RETRIES) {
    return true;
  }

  if (category === 'oom' && recentCount < MAX_RETRIES) {
    return getSmallerModel(currentModelId) !== null;
  }

  if (category === 'network' && recentCount < MAX_RETRIES) {
    return true;
  }

  return false;
}

/**
 * Get recommended action for recovery.
 */
export function getRecoveryAction(category: ErrorCategory, currentModelId: string): RecoveryResult {
  const success = canAutoRecover(category, currentModelId);

  if (category === 'oom') {
    const smallerModel = getSmallerModel(currentModelId);
    if (smallerModel) {
      return {
        success,
        message: getErrorMessage(category, new Error('OOM')),
        shouldSwitchModel: true,
        recommendedModel: smallerModel,
      };
    }
  }

  if (category === 'device-lost') {
    return {
      success,
      message: 'GPU error detected. Attempting to recover...',
    };
  }

  if (category === 'network') {
    return {
      success,
      message: 'Network error. Please check your connection and try again.',
    };
  }

  return {
    success: false,
    message: getErrorMessage(category, new Error('Unknown error')),
    shouldSwitchModel: getRecentErrorCount('oom') >= 2,
    recommendedModel: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
  };
}

/**
 * Check if device memory is sufficient for a model.
 */
export function checkMemorySufficient(modelId: string): { sufficient: boolean; available: number; required: number } {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  if (deviceMemory === undefined) {
    return { sufficient: true, available: 0, required: 0 };
  }

  const deviceMemoryMB = deviceMemory * 1024;
  const info = getModelInfo(modelId);
  const requiredMB = info?.vramMB ?? 0;
  const sufficient = requiredMB === 0 || deviceMemoryMB >= requiredMB;

  return {
    sufficient,
    available: deviceMemoryMB,
    required: requiredMB,
  };
}

/**
 * Get memory warning message if applicable.
 */
export function getMemoryWarning(modelId: string): string | null {
  const { sufficient, available, required } = checkMemorySufficient(modelId);

  if (!sufficient) {
    return `Warning: Your device may have insufficient memory for this model. Available: ~${Math.round(available / 1000)}GB, Required: ~${Math.round(required / 1000)}GB. Consider using a smaller model.`;
  }

  if (available > 0 && available < required * 1.2) {
    return `Notice: Memory is tight. Available: ~${Math.round(available / 1000)}GB. Close other tabs for best performance.`;
  }

  return null;
}

/**
 * Clear error history (call when model successfully loads).
 */
export function clearErrorHistory(): void {
  errorHistory.length = 0;
}

/**
 * Get error history for debugging.
 */
export function getErrorHistory(): ErrorContext[] {
  return [...errorHistory];
}
