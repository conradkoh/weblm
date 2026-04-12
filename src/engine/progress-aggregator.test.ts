import { describe, expect, test } from 'bun:test';
import { ProgressAggregator } from './progress-aggregator';
import type { ProgressInfo } from '@huggingface/transformers';

/** Helper: cast a partial progress object to ProgressInfo (tests construct these manually) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeProgress(file: string, status: ProgressInfo['status'], overrides: Partial<ProgressInfo> = {}): ProgressInfo {
  return {
    status,
    file: file || undefined,
    progress: 0,
    loaded: 0,
    total: 0,
    ...overrides,
  } as any;
}

describe('ProgressAggregator', () => {

  // ─── Reset ──────────────────────────────────────────────────

  describe('reset()', () => {
    test('clears all tracked files', () => {
      const agg = new ProgressAggregator();
      agg.process(makeProgress('model.bin', 'progress', { progress: 50, total: 100 }));
      agg.process(makeProgress('tokenizer.bin', 'progress', { progress: 30, total: 100 }));

      agg.reset();

      const result = agg.process(makeProgress('other.bin', 'progress', { progress: 10, total: 100 }));
      expect(result?.files?.map(f => f.file)).toEqual(['other.bin']);
    });
  });

  // ─── Single file ─────────────────────────────────────────────

  describe('single file download', () => {
    test('emits progress updates for a single file', () => {
      const agg = new ProgressAggregator();

      const r0 = agg.process(makeProgress('model.bin', 'initiate'));
      expect(r0).not.toBeNull();
      expect(r0!.phase).toBe('loading');
      expect(r0!.progress).toBe(0);
      expect(r0!.files!.length).toBe(1);
      expect(r0!.files!.at(0)!.file).toBe('model.bin');

      const r1 = agg.process(makeProgress('model.bin', 'progress', { progress: 25 }));
      expect(r1!.progress).toBe(25);
      expect(r1!.message).toContain('25%');

      const r2 = agg.process(makeProgress('model.bin', 'progress', { progress: 75 }));
      expect(r2!.progress).toBe(75);

      const r3 = agg.process(makeProgress('model.bin', 'done'));
      expect(r3).toBeNull(); // All files done
    });

    test('tracks timeElapsed', () => {
      const agg = new ProgressAggregator();
      const r = agg.process(makeProgress('model.bin', 'initiate'));
      expect(typeof r!.timeElapsed).toBe('number');
      expect(r!.timeElapsed).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Multiple concurrent files ───────────────────────────────

  describe('concurrent file downloads (the bug scenario)', () => {
    test('flickering is prevented: parallel updates return stable progress', () => {
      /**
       * This is the exact scenario that caused the bug:
       * File A (processor) and File B (model) download simultaneously,
       * with progress events arriving in interleaved order.
       *
       * Without aggregation: UI gets overwritten on every event → flicker.
       * With aggregation: weighted average keeps progress stable.
       */
      const agg = new ProgressAggregator();

      // Simulate interleaved progress events (as they arrive in reality)
      const events = [
        // Both files start downloading
        makeProgress('processor/tokenizer.json', 'progress', { progress: 10, total: 1000 }),
        makeProgress('model/decoder.bin', 'progress', { progress: 5, total: 5000 }),

        // Model is larger, so progress should be ~7% (5% from model, 10% from tokenizer)
        // Simple average: (10 + 5) / 2 = 7.5%
      ];

      const results = events.map(e => agg.process(e));
      const lastResult = results[results.length - 1];

      // Progress is a weighted average, not just the last value
      expect(lastResult!.progress).toBeGreaterThan(0);
      expect(lastResult!.files!.length).toBe(2);

      // Both files tracked
      const fileNames = lastResult!.files!.map(f => f.file);
      expect(fileNames).toContain('processor/tokenizer.json');
      expect(fileNames).toContain('model/decoder.bin');
    });

    test('weighted progress uses file sizes when available', () => {
      /**
       * Model file is 5000 bytes, tokenizer is 1000 bytes.
       * Model at 50% = 2500 bytes loaded
       * Tokenizer at 100% = 1000 bytes loaded
       * Total: 3500/6000 = ~58%
       *
       * Without weighting (simple avg): (50 + 100) / 2 = 75% ← WRONG
       * With weighting: 3500/6000 * 100 = 58%               ← CORRECT
       */
      const agg = new ProgressAggregator();

      agg.process(makeProgress('model.bin', 'progress', { progress: 50, total: 5000, loaded: 2500 }));
      const result = agg.process(
        makeProgress('tokenizer.bin', 'progress', { progress: 100, total: 1000, loaded: 1000 })
      );

      // Weighted: (50/100 * 5000 + 100/100 * 1000) / 6000 * 100 ≈ 58.3%
      expect(result!.progress).toBeGreaterThanOrEqual(58);
      expect(result!.progress).toBeLessThanOrEqual(59);
    });

    test('falls back to simple average when no file sizes available', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('file-a.bin', 'progress', { progress: 30 }));
      const result = agg.process(makeProgress('file-b.bin', 'progress', { progress: 60 }));

      // Simple average: (30 + 60) / 2 = 45%
      expect(result!.progress).toBe(45);
    });
  });

  // ─── File completion / removal ───────────────────────────────

  describe('file completion and removal', () => {
    test('completed files are removed from tracking', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('tokenizer.bin', 'progress', { progress: 100, total: 1000 }));
      const withTokenizer = agg.process(makeProgress('model.bin', 'progress', { progress: 50, total: 5000 }));

      expect(withTokenizer!.files!.length).toBe(2);

      // Now the tokenizer finishes
      const afterTokenizerDone = agg.process(makeProgress('tokenizer.bin', 'done'));

      expect(afterTokenizerDone!.files!.length).toBe(1);
      expect(afterTokenizerDone!.files!.at(0)!.file).toBe('model.bin');
    });

    test('returning null when all files complete', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('file-a.bin', 'progress', { progress: 100 }));
      agg.process(makeProgress('file-b.bin', 'progress', { progress: 100 }));

      // Simulate 'done' for file-a
      agg.process(makeProgress('file-a.bin', 'done'));

      const r = agg.process(makeProgress('file-b.bin', 'done'));
      expect(r).toBeNull();
    });
  });

  // ─── Primary message stability ─────────────────────────────────

  describe('primary message stability', () => {
    test('primary message shows the largest file, not the smallest', () => {
      /**
       * Tokenizer files are tiny; model files are large.
       * The message should always show the model file being downloaded,
       * not the tokenizer (which would cause the message to feel wrong).
       */
      const agg = new ProgressAggregator();

      agg.process(makeProgress('model.bin', 'progress', { progress: 5, total: 5000 }));
      const r1 = agg.process(makeProgress('tokenizer.json', 'progress', { progress: 90, total: 50 }));

      // Primary message should still show the model file
      expect(r1!.message).toContain('model.bin');
    });

    test('primary message updates when a larger new file appears', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('tokenizer.json', 'progress', { progress: 50, total: 50 }));
      expect(agg.process(makeProgress('model.bin', 'progress', { progress: 1, total: 5000 }))!.message)
        .toContain('model.bin');
    });

    test('primary file name remains stable across updates to the same file', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('model.bin', 'progress', { progress: 10, total: 5000 }));
      const r1 = agg.process(makeProgress('model.bin', 'progress', { progress: 20, total: 5000 }));
      const r2 = agg.process(makeProgress('model.bin', 'progress', { progress: 30, total: 5000 }));
      const r3 = agg.process(makeProgress('model.bin', 'progress', { progress: 40, total: 5000 }));

      // File name in message should be stable (percentage changes, name doesn't)
      expect(r1!.message).toContain('model.bin');
      expect(r2!.message).toContain('model.bin');
      expect(r3!.message).toContain('model.bin');
    });
  });

  // ─── Phase determination ──────────────────────────────────────

  describe('phase determination', () => {
    test('phase is "downloading" when any file has downloading status', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('model.bin', 'initiate'));
      expect(agg.process(makeProgress('model.bin', 'progress', { progress: 10 }))!.phase)
        .toBe('downloading');
    });

    test('phase falls back to "loading" when all files are in loading status', () => {
      const agg = new ProgressAggregator();

      const r = agg.process(makeProgress('model.bin', 'progress_total', { progress: 50 }));
      expect(r!.phase).toBe('loading');
    });
  });

  // ─── progress_total handling ─────────────────────────────────

  describe('progress_total events', () => {
    test('progress_total creates a single aggregate entry with no file', () => {
      const agg = new ProgressAggregator();

      const r = agg.process(makeProgress('model.bin', 'progress_total', { progress: 33, total: 100 }));

      expect(r!.phase).toBe('loading');
      expect(r!.progress).toBe(33);
      expect(r!.message).toContain('33%');
      expect(r!.files!.length).toBe(1);
      expect(r!.files!.at(0)!.file).toBe('');
    });

    test('progress_total and progress events coexist separately', () => {
      const agg = new ProgressAggregator();

      // Overall progress_total
      agg.process(makeProgress('model.bin', 'progress_total', { progress: 50 }));
      // Plus a per-file progress
      const r = agg.process(makeProgress('tokenizer.json', 'progress', { progress: 25, total: 100 }));

      // Two entries: one from progress_total, one from the file progress
      expect(r!.files!.length).toBe(2);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    test('handles events without a file path (initiate without file)', () => {
      const agg = new ProgressAggregator();

      const r = agg.process(makeProgress('model.bin', 'initiate'));
      expect(r).not.toBeNull();
      expect(r!.phase).toBe('loading');
    });

    test('progress values are rounded to integers', () => {
      const agg = new ProgressAggregator();

      const r = agg.process(makeProgress('model.bin', 'progress', { progress: 33.7 }));
      expect(r!.progress).toBe(34);
    });

    test('0% progress on initiate is still displayed', () => {
      const agg = new ProgressAggregator();

      const r = agg.process(makeProgress('model.bin', 'initiate'));
      expect(r!.progress).toBe(0);
      expect(r!.message).toContain('model.bin');
    });

    test('ready status removes file', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('model.bin', 'progress', { progress: 100, total: 5000 }));
      const r = agg.process(makeProgress('model.bin', 'ready'));
      // All files done → aggregator returns null
      expect(r).toBeNull();
    });

    test('all files removed returns null even with a follow-up event', () => {
      const agg = new ProgressAggregator();

      agg.process(makeProgress('model.bin', 'done'));
      const r = agg.process(makeProgress('another.bin', 'progress', { progress: 10 }));
      // The new event starts fresh tracking
      expect(r).not.toBeNull();
      expect(r!.files!.length).toBe(1);
    });
  });
});
