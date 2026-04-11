/**
 * Storage module types.
 *
 * Type definitions for IndexedDB operations,
 * model caching, and storage management.
 */

/**
 * Cached model metadata.
 */
export interface CachedModel {
  /** Model identifier */
  modelId: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Timestamp when cached */
  cachedAt: number;
  /** Model version/revision */
  version: string;
}

/**
 * Storage statistics.
 */
export interface StorageStats {
  /** Total bytes used by WebLM */
  usedBytes: number;
  /** Available quota in bytes */
  quotaBytes: number;
  /** Number of cached models */
  modelCount: number;
  /** List of cached model IDs */
  cachedModels: string[];
}

/**
 * Storage error types.
 */
export type StorageErrorType =
  | 'quota_exceeded'
  | 'not_found'
  | 'corrupted'
  | 'unsupported';

/**
 * Storage error with type information.
 */
export class StorageError extends Error {
  constructor(
    public readonly type: StorageErrorType,
    message: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export {};