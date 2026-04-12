/**
 * Worker Pool — manages multiple Web Workers for parallel inference.
 * 
 * Distributes generate requests across N workers using round-robin.
 * Each worker loads its own model instance (WASM mode).
 */

import type { ChatMessage } from '../../types';

export interface WorkerRequest {
  resolve: (content: string) => void;
  reject: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private pendingRequests: Map<string, WorkerRequest> = new Map();
  private initResolvers: Map<number, (() => void)> = new Map();
  private nextWorkerIndex = 0;
  private modelId: string;
  private size: number;
  private initialized = false;

  /**
   * Create a new worker pool.
   * @param modelId - The model to load in each worker (e.g., 'Xenova/phi-2')
   * @param size - Number of workers (default: 2)
   */
  constructor(modelId: string, size: number = 2) {
    this.modelId = modelId;
    this.size = size;
  }

  /**
   * Initialize the pool by creating workers and loading models.
   * Must be called before generate().
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.size; i++) {
      // Create worker using Vite's URL pattern for workers
      const worker = new Worker(
        new URL('./formatterWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      worker.onmessage = (event) => this.handleMessage(event, i);
      worker.onerror = (event) => this.handleError(event, i);

      this.workers.push(worker);

      // Create a promise that resolves when this worker is ready
      const initPromise = new Promise<void>((resolve, reject) => {
        this.initResolvers.set(i, resolve);
        // Store reject for error handling during init
        this.initResolvers.set(-i - 1, () => reject); // Use negative index for reject
      });

      initPromises.push(initPromise);

      // Send init message
      worker.postMessage({ type: 'init', modelId: this.modelId });
    }

    // Wait for all workers to be ready
    await Promise.all(initPromises);
    this.initialized = true;
  }

  /**
   * Send a generate request to the next available worker.
   */
  async generate(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.initialized || this.workers.length === 0) {
      throw new Error('WorkerPool not initialized. Call initialize() first.');
    }

    const id = crypto.randomUUID();
    const workerIndex = this.nextWorkerIndex;
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    const worker = this.workers[workerIndex];

    if (!worker) {
      throw new Error(`Worker at index ${workerIndex} not available`);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      // Send generate message to the selected worker
      worker.postMessage({
        type: 'generate',
        id,
        messages,
        options,
      });
    });
  }

  /**
   * Handle messages from workers.
   */
  private handleMessage(event: MessageEvent, workerIndex: number): void {
    const { type, id, content, error, message } = event.data;

    // Handle ready message (init complete)
    if (type === 'ready') {
      const resolver = this.initResolvers.get(workerIndex);
      if (resolver) {
        resolver();
        this.initResolvers.delete(workerIndex);
      }
      // Log message if present
      if (message) {
        console.log(`[Worker ${workerIndex}] ${message}`);
      }
      return;
    }

    // Handle result message
    if (type === 'result') {
      const request = this.pendingRequests.get(id);
      if (request) {
        request.resolve(content);
        this.pendingRequests.delete(id);
      }
      return;
    }

    // Handle error message
    if (type === 'error') {
      // Check if this is an init error (no id) or a generate error (has id)
      if (!id) {
        // Init error - reject the init promise
        const rejecter = this.initResolvers.get(-workerIndex - 1);
        if (rejecter) {
          rejecter();
          this.initResolvers.delete(-workerIndex - 1);
          this.initResolvers.delete(workerIndex);
        }
      } else {
        // Generate error
        const request = this.pendingRequests.get(id);
        if (request) {
          request.reject(new Error(error ?? 'Unknown worker error'));
          this.pendingRequests.delete(id);
        }
      }
      return;
    }

    // Handle log message
    if (type === 'log') {
      console.log(`[Worker ${workerIndex}] ${message}`);
    }
  }

  /**
   * Handle worker errors.
   */
  private handleError(event: ErrorEvent, workerIndex: number): void {
    console.error(`[Worker ${workerIndex}] Error:`, event.error);
    
    // If this worker was being initialized, reject the init promise
    const rejecter = this.initResolvers.get(-workerIndex - 1);
    if (rejecter) {
      rejecter();
      this.initResolvers.delete(-workerIndex - 1);
      this.initResolvers.delete(workerIndex);
    }
  }

  /**
   * Terminate all workers and clean up.
   */
  async terminate(): Promise<void> {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.pendingRequests.clear();
    this.initResolvers.clear();
    this.initialized = false;
  }

  /**
   * Number of workers in the pool.
   */
  get workerCount(): number {
    return this.workers.length;
  }

  /**
   * Check if the pool is initialized and ready.
   */
  get isInitialized(): boolean {
    return this.initialized;
  }
}