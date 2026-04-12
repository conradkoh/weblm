/**
 * ProgressAggregator — aggregates concurrent download progress events.
 *
 * When multiple files download in parallel (e.g. AutoProcessor + ModelClass
 * in TransformersJsAdapter.initializeConditionalGeneration()), each fires
 * independent progress callbacks. Without aggregation, the UI receives
 * a stream of competing updates and flickers between values.
 *
 * This class:
 * - Tracks per-file progress keyed by file path
 * - Calculates weighted overall progress (by file size when available)
 * - Maintains a stable primary message (largest file's context)
 * - Removes completed files from tracking
 * - Computes timeElapsed since the transformers lib doesn't provide it
 */

import type { ProgressInfo } from '@huggingface/transformers';
import type { ModelProgress } from './types';

/**
 * Per-file progress entry.
 */
interface FileProgress {
  file: string;
  phase: 'downloading' | 'loading';
  progress: number;       // 0-100
  message: string;
  loadedBytes?: number;
  totalBytes?: number;
}

/**
 * Aggregated progress output — compatible with the existing ModelProgress type
 * but with an optional files array for debugging/development.
 */
export interface AggregatedProgress extends ModelProgress {
  /** All tracked files (for debugging) */
  files?: FileProgress[];
}

/**
 * ProgressAggregator — aggregates concurrent progress callbacks into a single
 * stable update stream.
 *
 * Usage:
 * ```
 * const aggregator = new ProgressAggregator();
 *
 * progressCallback = (info) => {
 *   const result = aggregator.process(info);
 *   if (result && onProgress) onProgress(result);
 * };
 *
 * // ... when starting a new load:
 * aggregator.reset();
 * ```
 */
export class ProgressAggregator {
  private files = new Map<string, FileProgress>();
  private primaryFile: string | null = null;
  private startTime: number = Date.now();

  /**
   * Process a single progress event from the transformers library.
   * Returns an AggregatedProgress to emit to the UI, or null when there are
   * no active files (all downloads completed).
   */
  process(info: ProgressInfo): AggregatedProgress | null {
    // Use the file path as the unique key when available.
    // `TotalProgressInfo` has no `file` field — use `__total__` as sentinel.
    // `ReadyProgressInfo` has no `file` field — has no file to track.
    const fileKey = 'file' in info && info.file ? info.file : '__total__';

    if (info.status === 'done') {
      // File finished — remove from tracking
      this.files.delete(fileKey);
    } else if (info.status === 'ready') {
      // ready status has no file — clear all tracking
      this.files.clear();
    } else if (info.status === 'progress') {
      // Per-file download progress
      const entry: FileProgress = {
        file: info.file ?? '',
        phase: 'downloading',
        progress: Math.round(info.progress),
        message: `Downloading ${info.file ?? ''}… (${Math.round(info.progress)}%)`,
        loadedBytes: info.loaded,
        totalBytes: info.total,
      };

      this.files.set(fileKey, entry);

      if (this._isLargerThanCurrent(entry, fileKey)) {
        this.primaryFile = fileKey;
      }
    } else if (info.status === 'progress_total') {
      // Overall progress without per-file breakdown — create a single aggregate entry
      const entry: FileProgress = {
        file: '',
        phase: 'loading',
        progress: Math.round(info.progress),
        message: `Loading model… (${Math.round(info.progress)}%)`,
        loadedBytes: info.loaded,
        totalBytes: info.total,
      };

      this.files.set('__total__', entry);
      this.primaryFile = '__total__';
    } else {
      // 'initiate' | 'download' — just mark the file as starting
      const entry: FileProgress = {
        file: info.file ?? '',
        phase: 'loading',
        progress: 0,
        message: `Loading ${info.file ?? ''}…`,
      };

      this.files.set(fileKey, entry);
    }

    // If no active files, return null to stop sending updates
    if (this.files.size === 0) return null;

    const weightedProgress = this._calculateWeightedProgress();
    const primaryMessage = this._buildPrimaryMessage();
    const overallPhase = this._overallPhase();

    return {
      phase: overallPhase,
      progress: Math.round(weightedProgress),
      message: primaryMessage,
      timeElapsed: (Date.now() - this.startTime) / 1000,
      files: [...this.files.values()],
    };
  }

  /**
   * Reset the aggregator for a new load session.
   * Clears all tracked files, primary file, and restarts the timer.
   */
  reset(): void {
    this.files.clear();
    this.primaryFile = null;
    this.startTime = Date.now();
  }

  // ─── Private helpers ─────────────────────────────────────────

  /**
   * Calculate the overall progress as a weighted average.
   * If totalBytes is available for one or more files, weight by size.
   * Otherwise fall back to a simple average across all tracked files.
   */
  private _calculateWeightedProgress(): number {
    const entries = [...this.files.values()];
    if (entries.length === 0) return 0;

    const withSizes = entries.filter(e => e.totalBytes && e.totalBytes > 0);

    if (withSizes.length > 0) {
      // Size-weighted average: each file contributes (progress/100 * bytes) to total
      const totalBytes = withSizes.reduce((sum, e) => sum + (e.totalBytes ?? 0), 0);
      if (totalBytes === 0) {
        return entries.reduce((sum, e) => sum + e.progress, 0) / entries.length;
      }
      return (
        withSizes.reduce((sum, e) => sum + (e.progress / 100) * (e.totalBytes ?? 0), 0) /
        totalBytes *
        100
      );
    }

    // Fallback: simple average
    return entries.reduce((sum, e) => sum + e.progress, 0) / entries.length;
  }

  /**
   * Determine the overall phase based on tracked files.
   */
  private _overallPhase(): 'downloading' | 'loading' | 'compiling' | 'ready' {
    const phases = [...this.files.values()].map(f => f.phase);
    if (phases.includes('downloading')) return 'downloading';
    return 'loading';
  }

  /**
   * Build the primary message shown in the UI.
   * Uses the largest tracked file to avoid tiny auxiliary files
   * (e.g. tokenizer) from hijacking the display.
   */
  private _buildPrimaryMessage(): string {
    if (this.primaryFile) {
      const primary = this.files.get(this.primaryFile);
      if (primary) return primary.message;
    }

    // Fallback: most recently added entry
    const entries = [...this.files.values()];
    const last = entries[entries.length - 1];
    return last ? last.message : 'Loading…';
  }

  /**
   * Check whether a new entry should become the primary file.
   * A file becomes primary if it has a larger total size than the current primary.
   */
  private _isLargerThanCurrent(entry: FileProgress, fileKey: string): boolean {
    if (!this.primaryFile) return true;

    const currentPrimary = this.files.get(this.primaryFile);
    if (!currentPrimary) return true;

    const currentSize = currentPrimary.totalBytes ?? 0;
    const newSize = entry.totalBytes ?? 0;

    // New file with known size beats current primary with no size
    if (newSize > 0 && currentSize === 0) return true;
    // Known sizes: pick the larger one
    if (newSize > 0 && currentSize > 0) return newSize > currentSize;

    return false;
  }
}
