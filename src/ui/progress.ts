/**
 * Model download progress bar component.
 *
 * Responsibilities:
 * - Display progress during initial model download
 * - Show download speed and estimated time remaining
 * - Handle multi-phase loading (download -> compile -> ready)
 * - Cancellable download option
 */

import type { ModelProgress } from '../engine/types';

/**
 * Create and mount the progress bar component.
 */
export function createProgressBar(_container: HTMLElement): void {
  // Implementation to be added
}

/**
 * Update progress display.
 */
export function updateProgress(_progress: ModelProgress): void {
  // Implementation to be added
}

/**
 * Hide the progress bar after loading complete.
 */
export function hideProgressBar(): void {
  // Implementation to be added
}

/**
 * Show an error message in the progress area.
 */
export function showProgressError(_error: string): void {
  // Implementation to be added
}

export {};