/**
 * Error recovery and handling for WebLLM engine.
 * 
 * Responsibilities:
 * - Categorize errors (OOM, device lost, network, unknown)
 * - Attempt automatic recovery from transient errors
 * - Track error counts for model recommendations
 * - Provide user-friendly error messages
 */

import { MODEL_INFO, MODEL_VARIANTS, type ModelVariant } from '../config';
import { logger } from '../logger';

/** Error categories */
export type ErrorCategory = 'oom' | 'device-lost' | 'network' | 'validation' | 'unknown';

/** Error recovery result */
export interface RecoveryResult {
  success: boolean;
  message: string;
  shouldSwitchModel?: boolean;
  recommendedModel?: ModelVariant;
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
 * Get the next smaller model in the fallback chain.
 * Fallback order: 27b -> 12b -> 4b -> 1b
 */
function getSmallerModel(model: ModelVariant): ModelVariant | null {
  const fallbackOrder: ModelVariant[] = ['gemma3-27b', 'gemma3-12b', 'gemma3-4b', 'gemma3-1b'];
  const index = fallbackOrder.indexOf(model);
  // If not found or already at smallest (last index), return null
  if (index === -1 || index === fallbackOrder.length - 1) {
    return null;
  }
  return fallbackOrder[index + 1] ?? null;
}

/**
 * Categorize an error based on its message/type.
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name?.toLowerCase() || '';

  // Check for OOM errors
  if (
    message.includes('out of memory') ||
    message.includes('oom') ||
    message.includes('memory allocation failed') ||
    message.includes('not enough memory') ||
    name.includes('outofmemory')
  ) {
    return 'oom';
  }

  // Check for device lost errors
  if (
    message.includes('device lost') ||
    message.includes('device was lost') ||
    message.includes('gpu crashed') ||
    message.includes('webgpu device lost') ||
    message.includes('context lost')
  ) {
    return 'device-lost';
  }

  // Check for network errors
  if (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('download failed') ||
    message.includes('connection') ||
    name.includes('networkerror')
  ) {
    return 'network';
  }

  // Check for validation errors
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

  // Keep only last 10 errors
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
  return errorHistory.filter(e => 
    e.lastCategory === category && (now - e.timestamp) < withinMs
  ).length;
}

/**
 * Determine if automatic recovery is possible.
 */
export function canAutoRecover(category: ErrorCategory, currentModel: ModelVariant): boolean {
  const recentCount = getRecentErrorCount(category);
  
  // For device-lost errors, we can try to reload the model
  if (category === 'device-lost' && recentCount < MAX_RETRIES) {
    return true;
  }

  // For OOM errors, we can try switching to a smaller model
  if (category === 'oom' && recentCount < MAX_RETRIES) {
    // Can switch if there's a smaller model available
    return getSmallerModel(currentModel) !== null;
  }

  // Network errors can be retried
  if (category === 'network' && recentCount < MAX_RETRIES) {
    return true;
  }

  return false;
}

/**
 * Get recommended action for recovery.
 */
export function getRecoveryAction(category: ErrorCategory, currentModel: ModelVariant): RecoveryResult {
  const success = canAutoRecover(category, currentModel);
  
  // For OOM, recommend smaller model
  if (category === 'oom') {
    const smallerModel = getSmallerModel(currentModel);
    if (smallerModel) {
      return {
        success,
        message: getErrorMessage(category, new Error('OOM')),
        shouldSwitchModel: true,
        recommendedModel: smallerModel,
      };
    }
  }

  // For device-lost, recommend reload
  if (category === 'device-lost') {
    return {
      success,
      message: 'GPU error detected. Attempting to recover...',
    };
  }

  // For network, recommend retry
  if (category === 'network') {
    return {
      success,
      message: 'Network error. Please check your connection and try again.',
    };
  }

  // For other errors, give general guidance
  return {
    success: false,
    message: getErrorMessage(category, new Error('Unknown error')),
    shouldSwitchModel: getRecentErrorCount('oom') >= 2,
    recommendedModel: 'gemma3-1b',
  };
}

/**
 * Check if device memory is sufficient for a model.
 */
export function checkMemorySufficient(model: ModelVariant): { sufficient: boolean; available: number; required: number } {
  // Use navigator.deviceMemory if available (Chrome only)
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  
  if (deviceMemory === undefined) {
    // Can't determine - assume sufficient
    return { sufficient: true, available: 0, required: 0 };
  }

  const deviceMemoryMB = deviceMemory * 1024;
  const requiredMB = MODEL_INFO[model].vramMB;
  const sufficient = deviceMemoryMB >= requiredMB;

  return {
    sufficient,
    available: deviceMemoryMB,
    required: requiredMB,
  };
}

/**
 * Get memory warning message if applicable.
 */
export function getMemoryWarning(model: ModelVariant): string | null {
  const { sufficient, available, required } = checkMemorySufficient(model);
  
  if (!sufficient) {
    return `Warning: Your device may have insufficient memory for this model. Available: ~${Math.round(available / 1000)}GB, Required: ~${Math.round(required / 1000)}GB. Consider using a smaller model.`;
  }

  // Check if memory is tight (between 80-100% of required)
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