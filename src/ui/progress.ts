/**
 * Model download progress bar component.
 *
 * Responsibilities:
 * - Display progress during initial model download
 * - Show download speed and estimated time remaining
 * - Handle multi-phase loading (download -> compile -> ready)
 * - Error display with retry option
 */

import type { ModelProgress } from '../engine/types';

/** Progress bar container element */
let progressContainer: HTMLElement | null = null;
let progressBarInner: HTMLElement | null = null;
let progressText: HTMLElement | null = null;
let progressPhase: HTMLElement | null = null;
let progressTime: HTMLElement | null = null;
let errorContainer: HTMLElement | null = null;
let retryButton: HTMLElement | null = null;
let onRetryCallback: (() => void) | null = null;

/**
 * Create and mount the progress bar component.
 */
export function createProgressBar(container: HTMLElement): void {
  // Remove any existing progress bar
  hideProgressBar();

  // Create progress bar container
  progressContainer = document.createElement('div');
  progressContainer.className = 'progress-container';
  progressContainer.innerHTML = `
    <div class="progress-info">
      <span class="progress-phase" id="progress-phase">Initializing...</span>
      <span class="progress-percent" id="progress-text">0%</span>
    </div>
    <div class="progress-bar-outer">
      <div class="progress-bar-inner" id="progress-bar-inner"></div>
    </div>
    <div class="progress-time" id="progress-time">Time elapsed: 0s</div>
    <div class="progress-error" id="progress-error" style="display: none;">
      <p class="error-message"></p>
      <button class="retry-button" id="retry-button">Try Again</button>
    </div>
  `;

  container.appendChild(progressContainer);

  // Get references
  progressBarInner = document.getElementById('progress-bar-inner');
  progressText = document.getElementById('progress-text');
  progressPhase = document.getElementById('progress-phase');
  progressTime = document.getElementById('progress-time');
  errorContainer = document.getElementById('progress-error');
  retryButton = document.getElementById('retry-button');

  // Setup retry button
  if (retryButton) {
    retryButton.addEventListener('click', () => {
      if (onRetryCallback) {
        hideError();
        onRetryCallback();
      }
    });
  }
}

/**
 * Update progress display.
 */
export function updateProgress(progress: ModelProgress): void {
  if (!progressBarInner || !progressText || !progressPhase || !progressTime) {
    return;
  }

  // Update progress bar width
  progressBarInner.style.width = `${progress.progress}%`;

  // Update percentage text
  progressText.textContent = `${Math.round(progress.progress)}%`;

  // Update phase text
  let phaseText = 'Loading...';
  if (progress.phase === 'downloading') {
    phaseText = 'Downloading model...';
  } else if (progress.phase === 'compiling') {
    phaseText = 'Compiling model...';
  } else if (progress.phase === 'loading') {
    phaseText = 'Initializing...';
  } else if (progress.phase === 'ready') {
    phaseText = 'Ready!';
  }
  progressPhase.textContent = progress.message || phaseText;

  // Update time elapsed
  if (progress.timeElapsed !== undefined) {
    const seconds = Math.round(progress.timeElapsed);
    progressTime.textContent = `Time elapsed: ${seconds}s`;
  }
}

/**
 * Hide the progress bar after loading complete.
 */
export function hideProgressBar(): void {
  if (progressContainer) {
    progressContainer.remove();
    progressContainer = null;
    progressBarInner = null;
    progressText = null;
    progressPhase = null;
    progressTime = null;
    errorContainer = null;
    retryButton = null;
    onRetryCallback = null;
  }
}

/**
 * Show an error message in the progress area.
 */
export function showProgressError(error: string, onRetry?: () => void): void {
  if (!errorContainer) {
    return;
  }

  const errorMessage = errorContainer.querySelector('.error-message');
  if (errorMessage) {
    errorMessage.textContent = error;
  }

  errorContainer.style.display = 'block';
  onRetryCallback = onRetry || null;

  // Hide retry button if no callback
  if (retryButton) {
    retryButton.style.display = onRetry ? 'inline-block' : 'none';
  }
}

/**
 * Hide the error display.
 */
function hideError(): void {
  if (errorContainer) {
    errorContainer.style.display = 'none';
  }
}

/**
 * Set a custom status message.
 */
export function setProgressMessage(message: string): void {
  if (progressPhase) {
    progressPhase.textContent = message;
  }
}