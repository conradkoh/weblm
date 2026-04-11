/**
 * File upload handling utilities.
 *
 * Responsibilities:
 * - Provide callbacks for file upload events
 * - Manage uploaded file state tracking
 */

import type { UploadedFile } from '../ui/upload';
import { logger } from '../logger';

/**
 * File upload state management interface.
 */
export interface FileUploadState {
  getUploadedFile: () => UploadedFile | null;
  setUploadedFile: (file: UploadedFile | null) => void;
}

/**
 * Upload UI reference type.
 */
export type UploadUIRef = ReturnType<typeof import('../ui/upload')['createUploadUI']> | null;

/**
 * Handle file loaded event.
 * Updates state and UI when a file is uploaded.
 */
export function handleFileLoaded(
  file: UploadedFile,
  state: FileUploadState,
  uploadUI: UploadUIRef
): void {
  state.setUploadedFile(file);
  uploadUI?.setFileInfo(file);
  logger.debug(`file loaded: ${file.name} (${file.size} bytes)`);
}

/**
 * Handle file clear event.
 * Clears state and UI when a file is removed.
 */
export function handleFileClear(
  state: FileUploadState,
  uploadUI: UploadUIRef
): void {
  state.setUploadedFile(null);
  uploadUI?.clearFileInfo();
  logger.debug('file cleared');
}

/**
 * Create a file handler with bound callbacks.
 * Returns callbacks that can be passed to createUploadUI.
 */
export function createFileHandlers(
  state: FileUploadState,
  uploadUI: UploadUIRef
): {
  onFileLoaded: (file: UploadedFile) => void;
  onFileClear: () => void;
} {
  return {
    onFileLoaded: (file: UploadedFile) => {
      handleFileLoaded(file, state, uploadUI);
    },
    onFileClear: () => {
      handleFileClear(state, uploadUI);
    },
  };
}