/**
 * WorkerPool Formatter Backend.
 * 
 * Implements FormatterBackend interface using a pool of Web Workers
 * for parallel local inference. Each worker runs Transformers.js in WASM mode.
 */

import type { FormatterBackend } from './backend';
import type { ChatMessage } from '../../types';
import { WorkerPool } from './workerPool';
import { logger } from '../../logger';

/**
 * Backend using Web Worker pool for parallel local inference.
 * 
 * Note: Each worker loads its own model copy, so memory usage is N * model_size.
 * Uses WASM device (not WebGPU) for worker compatibility.
 */
export class WorkerPoolFormatterBackend implements FormatterBackend {
  private pool: WorkerPool | null = null;
  private modelId: string;
  private poolSize: number;
  private initPromise: Promise<void> | null = null;

  /**
   * Create a new WorkerPool backend.
   * @param modelId - Model identifier (e.g., 'Xenova/phi-2')
   * @param poolSize - Number of workers (default: 2)
   */
  constructor(modelId: string, poolSize: number = 2) {
    this.modelId = modelId;
    this.poolSize = poolSize;
  }

  /**
   * Ensure the pool is initialized before use.
   * Uses lazy initialization on first generate() call.
   */
  private async ensureInitialized(): Promise<void> {
    // Already initialized
    if (this.pool?.isInitialized) return;

    // Already initializing
    if (this.initPromise) return this.initPromise;

    // Start initialization
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * Perform the actual initialization.
   */
  private async doInitialize(): Promise<void> {
    logger.info(`WorkerPoolFormatterBackend: Initializing ${this.poolSize} workers for ${this.modelId}`);

    this.pool = new WorkerPool(this.modelId, this.poolSize);

    try {
      await this.pool.initialize();
      logger.info(`WorkerPoolFormatterBackend: All ${this.poolSize} workers ready`);
    } catch (error) {
      logger.error(`WorkerPoolFormatterBackend: Initialization failed:`, error);
      await this.pool.terminate();
      this.pool = null;
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Generate text using the worker pool.
   * 
   * Note: Worker-based generation may not support token-level streaming
   * due to worker message serialization. The onToken callback in options
   * is a no-op for worker backends currently.
   */
  async generate(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; onToken?: (token: string) => void }
  ): Promise<string> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('WorkerPool not available after initialization');
    }

    // TODO: Implement token-level streaming for worker pool if feasible
    // Workers serialize messages, so token-level callbacks would require
    // protocol changes. Currently onToken is not called.
    void options?.onToken; // Acknowledge but don't use (not yet supported)

    return this.pool.generate(messages, options);
  }

  /**
   * Worker pool supports concurrent requests (multiple workers).
   */
  supportsConcurrency(): boolean {
    return true;
  }

  /**
   * Recommended concurrency equals the pool size.
   */
  recommendedConcurrency(): number {
    return this.poolSize;
  }

  /**
   * This is a worker pool backend (uses local Workers for parallel inference).
   */
  type(): 'worker' {
    return 'worker';
  }

  /**
   * Get the model ID this backend uses.
   */
  get modelIdentifier(): string {
    return this.modelId;
  }

  /**
   * Get the number of workers in the pool.
   */
  get workerCount(): number {
    return this.poolSize;
  }

  /**
   * Get the actual worker count (0 if not initialized).
   */
  get activeWorkerCount(): number {
    return this.pool?.workerCount ?? 0;
  }

  /**
   * Terminate the worker pool and release resources.
   */
  async terminate(): Promise<void> {
    if (this.pool) {
      logger.info('WorkerPoolFormatterBackend: Terminating workers');
      await this.pool.terminate();
      this.pool = null;
    }
    this.initPromise = null;
  }
}

/**
 * Helper to create a WorkerPoolFormatterBackend from a model ID.
 * Determines pool size based on device capabilities.
 */
export async function createWorkerBackend(
  modelId: string,
  poolSize?: number
): Promise<WorkerPoolFormatterBackend> {
  // Default pool size based on hardware (navigator.hardwareConcurrency if available)
  const defaultSize = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? Math.min(navigator.hardwareConcurrency, 4) // Cap at 4 to limit memory usage
    : 2;

  const size = poolSize ?? defaultSize;
  const backend = new WorkerPoolFormatterBackend(modelId, size);

  // Trigger lazy initialization
  await backend.generate([
    { id: 'init', role: 'system', content: 'init', timestamp: new Date().toISOString() }
  ]);

  return backend;
}