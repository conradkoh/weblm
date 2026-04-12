# Progress Flickering Bug — Analysis & Solution

> **Date:** 2026-04-12  
> **Status:** Root cause identified, solution proposed  
> **Affects:** `TransformersJsAdapter` model loading (conditional-generation models like Gemma 4)  
> **Does NOT affect:** `WebLLMAdapter` — which handles a single sequential download cleanly

---

## 1. Bug Symptoms

When loading a conditional-generation model (e.g. Gemma 4), the progress bar flickers and shows erratic percentage jumps:

```
Downloading onnx/decoder_model_merged_q4f16.onnx_data… (2%)    ← suddenly jumps
Downloading onnx/tokenizer/tokenizer_model (50%)             ← then back
```

The percentage can go up AND down, the message changes between files unpredictably, and the bar width visibly oscillates.

---

## 2. Root Cause

### The Problem: Concurrent Progress Callbacks in `Promise.all`

In `TransformersJsAdapter.initializeConditionalGeneration()`:

```typescript
private async initializeConditionalGeneration(
  modelId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const { AutoProcessor, Gemma4ForCausalLM: ModelClass } =
    await import('@huggingface/transformers');

  const progressCallback = (info: ProgressInfo) => {
    this.handleProgress(info, onProgress);
  };

  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(modelId, {
      progress_callback: progressCallback,  // ← Source A
    }),
    ModelClass.from_pretrained(modelId, {
      dtype: 'q4f16',
      device: 'webgpu',
      progress_callback: progressCallback,  // ← Source B (same handler!)
    }),
  ]);

  this.state = { kind: 'conditional-generation', processor, model };
}
```

Both `AutoProcessor.from_pretrained()` and `ModelClass.from_pretrained()` fire progress events **in parallel**, each with their own independent progress values (0–100). They share the same `progressCallback` handler, and `handleProgress()` simply passes each event through to the UI:

```typescript
private handleProgress(info: ProgressInfo, onProgress?: ProgressCallback): void {
  if (!onProgress) return;

  let progress: ModelProgress;

  if (info.status === 'progress') {
    progress = {
      phase: 'downloading',
      progress: Math.round(info.progress ?? 0),
      message: `Downloading ${info.file ?? ''}… (${Math.round(info.progress ?? 0)}%)`,
    };
  } else if (info.status === 'progress_total') {
    progress = {
      phase: 'loading',
      progress: Math.round(info.progress ?? 0),
      message: `Loading model… (${Math.round(info.progress ?? 0)}%)`,
    };
  } else if (info.status === 'done') {
    progress = {
      phase: 'loading',
      progress: 100,
      message: `Loaded${info.file ? ` ${info.file}` : ''}…`,
    };
  } else {
    progress = {
      phase: 'loading',
      progress: 0,
      message: `Loading${info.file ? ` ${info.file}` : ''}…`,
    };
  }

  onProgress(progress); // ← Direct passthrough — no aggregation
}
```

### Why the UI Flickers

```
Timeline:
  t=0ms    File A (processor):  status=initiate,  progress=0%
  t=100ms  File A (processor):  status=progress,  progress=5%   → UI shows 5%, file A
  t=150ms  File B (model):      status=initiate,  progress=0%   → UI shows 0%, file B
  t=300ms  File A (processor):  status=progress,  progress=50%  → UI jumps to 50%
  t=350ms  File B (model):      status=progress,  progress=10%  → UI drops to 10%
  t=400ms  File A (processor):  status=done,     progress=100% → UI jumps to 100%
  t=450ms  File B (model):      status=progress,  progress=30%  → UI drops to 30%
  ...
```

The store receives an unfiltered stream of competing progress updates and overwrites state on every callback. The UI just displays whatever was last written — causing visible oscillation.

### Why the pipeline (`initializePipeline`) is unaffected

The pipeline path uses a single `pipeline()` call, which reports progress sequentially for one download at a time:

```typescript
private async initializePipeline(
  modelId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const pipe = await pipeline('text-generation', modelId, {
    device: 'webgpu',
    progress_callback: (info: ProgressInfo) => {
      this.handleProgress(info, onProgress);  // ← Single source, no race condition
    },
  }) as TextGenerationPipeline;

  this.state = { kind: 'pipeline', pipe };
}
```

---

## 3. Data Flow Diagram

### Current (Buggy) Architecture

```
@huggingface/transformers
│
├── AutoProcessor.from_pretrained()
│   └── progress_callback ──────────────────────────────┐
│                                                       │
├── ModelClass.from_pretrained()                        │ (parallel!)
│   └── progress_callback ─────────────────────────────┤
│                                                       │
│   Both callbacks call:                                ▼
│   handleProgress(info, onProgress)                    │
│                                                       │
│   Each call does: onProgress(progress)  ← overwrites │
│                                                       │
└───────────────────────────────────────────────────────┘
                                │
                                ▼
                        engineStore.svelte.ts
                        updateProgress(progress)
                                │
                                │ _state.progress = progress (overwrite)
                                │
                                ▼
                        src/components/ProgressBar.svelte
                        {progress ? progress.progress : 0}%
                        {progress?.message}
```

### Proposed Fixed Architecture

```
@huggingface/transformers
│
├── AutoProcessor.from_pretrained()
│   └── progress_callback ──────────────┐
│                                         │
├── ModelClass.from_pretrained()          │ (parallel)
│   └── progress_callback ────────────────┤
│                                         │
│   Both call:                            ▼
│   ProgressAggregator.process(info)      │
│                                         │
│   Aggregator tracks per-file progress:  │
│   { "file-a.bin": {loaded,total},       │
│     "file-b.bin": {loaded,total} }     │
│                                         │
│   Emits ONE stable aggregated update:   │
│   { progress: 35, message: "downloading  │
│     model-00001-of-00005 (35%)" }       │
│                                         │
└─────────────────────────────────────────┘
            │
            ▼
    engineStore.svelte.ts
    updateProgress(aggregatedProgress)
            │
            ▼
    ProgressBar.svelte (stable updates)
```

---

## 4. Current Type Definitions

From `src/engine/types.ts`:

```typescript
export interface ModelProgress {
  phase: 'downloading' | 'compiling' | 'loading' | 'ready';
  progress: number;        // 0-100
  message: string;         // Human-readable status
  timeElapsed?: number;    // Seconds (WebLLM only)
}

export type ProgressCallback = (progress: ModelProgress) => void;
```

From `@huggingface/transformers` (`ProgressInfo`):

```typescript
interface ProgressInfo {
  status: 'initiate' | 'progress' | 'progress_total' | 'download' | 'done' | 'ready';
  progress?: number;      // 0-100 (percentage)
  file?: string;           // File path being processed
  loaded?: number;         // Bytes loaded
  total?: number;          // Total bytes
}
```

---

## 5. Proposed Solution Architecture

### `ProgressAggregator` Class Design

The aggregator must track multiple concurrent downloads and compute a stable, weighted overall progress value.

```typescript
// src/engine/progress-aggregator.ts

interface FileProgress {
  file: string;
  phase: 'downloading' | 'loading' | 'ready';
  progress: number;       // 0-100
  message: string;
  loadedBytes?: number;
  totalBytes?: number;
}

interface AggregatedProgress {
  phase: 'downloading' | 'loading' | 'compiling' | 'ready';
  progress: number;        // 0-100, weighted average
  message: string;        // Primary file message (most recently started)
  timeElapsed?: number;
  files: FileProgress[];   // All tracked files (for debugging)
}

class ProgressAggregator {
  private files: Map<string, FileProgress> = new Map();
  private primaryFile: string | null = null;
  private startTime: number = Date.now();

  process(info: ProgressInfo): AggregatedProgress | null {
    // 1. Identify file key (use file path as unique identifier)
    const fileKey = info.file ?? '__init__';

    // 2. Update or create file entry
    if (info.status === 'done' || info.status === 'ready') {
      this.files.delete(fileKey);
    } else {
      this.files.set(fileKey, {
        file: info.file ?? '',
        phase: info.status === 'progress' ? 'downloading' : 'loading',
        progress: Math.round(info.progress ?? 0),
        message: this._buildMessage(info),
        loadedBytes: info.loaded,
        totalBytes: info.total,
      });

      // Set primary file to the largest or most recently updated
      if (!this.primaryFile || this._isPrimaryCandidate(info)) {
        this.primaryFile = fileKey;
      }
    }

    // 3. Return null if no active files (avoid sending stale updates)
    if (this.files.size === 0) return null;

    // 4. Calculate weighted overall progress
    const weightedProgress = this._calculateWeightedProgress();

    // 5. Build primary message from dominant file
    const primaryMessage = this._buildPrimaryMessage();

    return {
      phase: this._overallPhase(),
      progress: Math.round(weightedProgress),
      message: primaryMessage,
      timeElapsed: (Date.now() - this.startTime) / 1000,
      files: [...this.files.values()],
    };
  }

  reset(): void {
    this.files.clear();
    this.primaryFile = null;
    this.startTime = Date.now();
  }

  private _calculateWeightedProgress(): number {
    // Weight by file size (if totalBytes is available)
    // Otherwise weight equally
    const entries = [...this.files.values()];
    const withSizes = entries.filter(e => e.totalBytes && e.totalBytes > 0);

    if (withSizes.length > 0) {
      const totalWeight = withSizes.reduce((sum, e) => sum + (e.totalBytes ?? 0), 0);
      return withSizes.reduce((sum, e) =>
        sum + ((e.progress / 100) * (e.totalBytes ?? 0)) / totalWeight * 100, 0
      );
    }

    // Fallback: simple average
    return entries.reduce((sum, e) => sum + e.progress, 0) / entries.length;
  }

  private _overallPhase(): 'downloading' | 'loading' | 'compiling' | 'ready' {
    const phases = [...this.files.values()].map(f => f.phase);
    if (phases.includes('downloading')) return 'downloading';
    return 'loading';
  }

  private _buildMessage(info: ProgressInfo): string {
    if (info.status === 'progress') {
      return `Downloading ${info.file ?? ''}… (${Math.round(info.progress ?? 0)}%)`;
    }
    if (info.status === 'progress_total') {
      return `Loading model… (${Math.round(info.progress ?? 0)}%)`;
    }
    if (info.status === 'done') {
      return `Loaded ${info.file ?? ''}`;
    }
    return `Loading ${info.file ?? ''}…`;
  }

  private _buildPrimaryMessage(): string {
    const primary = this.primaryFile ? this.files.get(this.primaryFile) : null;
    if (primary) return primary.message;

    // Fallback: most recent file
    const entries = [...this.files.values()];
    if (entries.length === 0) return 'Loading…';
    return entries[entries.length - 1].message;
  }

  private _isPrimaryCandidate(info: ProgressInfo): boolean {
    // Prefer the file with the largest total size or newest update
    return (info.total ?? 0) > 0;
  }
}
```

### Integration Points

**In `TransformersJsAdapter`:**
```typescript
private async initializeConditionalGeneration(
  modelId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const { AutoProcessor, Gemma4ForCausalLM: ModelClass } =
    await import('@huggingface/transformers');

  const aggregator = new ProgressAggregator();

  const progressCallback = (info: ProgressInfo) => {
    const aggregated = aggregator.process(info);
    if (aggregated && onProgress) {
      onProgress(aggregated);
    }
  };

  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(modelId, {
      progress_callback: progressCallback,
    }),
    ModelClass.from_pretrained(modelId, {
      dtype: 'q4f16',
      device: 'webgpu',
      progress_callback: progressCallback,
    }),
  ]);

  this.state = { kind: 'conditional-generation', processor, model };
}
```

**In `engineStore.svelte.ts`:** No changes needed — `updateProgress()` already accepts a `ModelProgress` object.

**In `ProgressBar.svelte`:** Minor update to handle `files` array (for debugging/development mode). Production UI remains unchanged.

---

## 6. Key Implementation Notes

1. **File size weighting**: If `info.total` is available, weight each file's contribution to overall progress by its size. This means downloading a 500MB file and a 50MB file together shows correct overall progress even when they advance at different rates.

2. **Primary message stability**: Always show the message from the primary (largest or most recently started) file. Don't let a tiny auxiliary file hijack the message.

3. **Time elapsed**: The aggregator tracks its own start time. WebLLM provides `timeElapsed` in the callback; the transformers callback does not, so we compute it ourselves.

4. **Graceful completion**: When `status === 'done'` for a file, remove it from the tracking map. If the map is empty, stop sending updates (or send a final `ready` state).

5. **Reset on new load**: Call `aggregator.reset()` before starting a new load so stale state doesn't bleed through.

6. **Pipeline path unchanged**: `initializePipeline()` uses a single sequential download — no aggregation needed, but the aggregator can safely handle it too (single entry in the map).

---

## 7. Files to Modify

| File | Change |
|------|--------|
| `src/engine/progress-aggregator.ts` | **New file** — `ProgressAggregator` class |
| `src/engine/transformers-adapter.ts` | Use `ProgressAggregator` in `initializeConditionalGeneration()` |
| `src/engine/types.ts` | Extend `ModelProgress` with optional `files` array for debugging |
| `src/components/ProgressBar.svelte` | Minor: support `files` array (dev mode only, optional) |

**Files NOT needing changes:**
- `src/stores/engineStore.svelte.ts` — interface already compatible
- `src/components/Launcher.svelte` — reads store reactively, no direct changes
- `src/engine/webllm-adapter.ts` — single sequential download, not affected
