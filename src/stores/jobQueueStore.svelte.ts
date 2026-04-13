/**
 * JobQueue store — centralized LLM job queue management.
 *
 * Manages a queue of LLM jobs with reactive state.
 * Jobs include refinement, extraction, schema generation, and structured extraction.
 * Maintains history of last 100 jobs (FIFO).
 */

import type { Job, JobInput, JobQueueState, JobType } from './types';
import { logger } from '../logger';

// Maximum number of jobs to keep in history
const MAX_HISTORY_SIZE = 100;

// ─── State ────────────────────────────────────────────────────

const _state = $state<JobQueueState>({
  jobs: [],
  currentJobId: null,
  isProcessing: false,
  totalProcessed: 0,
  totalPending: 0,
});

// ─── Getters ──────────────────────────────────────────────────

/** Returns the reactive job queue state. */
export function getJobQueueState(): JobQueueState {
  return _state;
}

// ─── Mutations ────────────────────────────────────────────────

/**
 * Generate a unique job ID.
 */
function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Recalculate pending count.
 */
function updatePendingCount(): void {
  _state.totalPending = _state.jobs.filter(j => j.status === 'pending').length;
}

// ─── Actions ─────────────────────────────────────────────────

/**
 * Add a job to the queue.
 * 
 * @param type - The type of job
 * @param input - The job input (messages and options)
 * @returns The generated job ID
 */
export function enqueue(type: JobType, input: JobInput): string {
  const id = generateJobId();
  
  const job: Job = {
    id,
    type,
    status: 'pending',
    input,
    output: null,
    error: null,
    createdAt: Date.now(),
    completedAt: null,
    streamingText: '',
  };

  // Add to beginning of queue (newest first)
  _state.jobs = [job, ..._state.jobs];
  
  // Trim history to max size
  if (_state.jobs.length > MAX_HISTORY_SIZE) {
    _state.jobs = _state.jobs.slice(0, MAX_HISTORY_SIZE);
  }

  updatePendingCount();
  
  logger.info(`JobQueue: Enqueued job ${id} of type ${type}`);
  
  return id;
}

/**
 * Get a job by ID.
 */
export function getJob(jobId: string): Job | undefined {
  return _state.jobs.find(j => j.id === jobId);
}

/**
 * Update the streaming text for a job.
 * Called during LLM processing to accumulate streaming tokens.
 * 
 * @param jobId - The job ID
 * @param text - The token/text to append
 */
export function updateStreamingText(jobId: string, text: string): void {
  const job = getJob(jobId);
  if (job) {
    job.streamingText += text;
  }
}

/**
 * Clear the streaming text for a job.
 * 
 * @param jobId - The job ID
 */
export function clearStreamingText(jobId: string): void {
  const job = getJob(jobId);
  if (job) {
    job.streamingText = '';
  }
}

/**
 * Mark a job as processing.
 * Sets status to 'processing' and clears any previous streaming text.
 * 
 * @param jobId - The job ID
 */
export function startJob(jobId: string): void {
  const job = getJob(jobId);
  if (job) {
    job.status = 'processing';
    job.streamingText = '';
    _state.currentJobId = jobId;
    _state.isProcessing = true;
    updatePendingCount();
    
    logger.info(`JobQueue: Started job ${jobId}`);
  }
}

/**
 * Mark a job as completed with output.
 * 
 * @param jobId - The job ID
 * @param output - The final output text
 */
export function completeJob(jobId: string, output: string): void {
  const job = getJob(jobId);
  if (job) {
    job.status = 'completed';
    job.output = output;
    job.completedAt = Date.now();
    _state.currentJobId = null;
    _state.isProcessing = false;
    _state.totalProcessed++;
    updatePendingCount();
    
    logger.info(`JobQueue: Completed job ${jobId}`);
  }
}

/**
 * Mark a job as failed with an error.
 * 
 * @param jobId - The job ID
 * @param error - The error message
 */
export function failJob(jobId: string, error: string): void {
  const job = getJob(jobId);
  if (job) {
    job.status = 'error';
    job.error = error;
    job.completedAt = Date.now();
    _state.currentJobId = null;
    _state.isProcessing = false;
    updatePendingCount();
    
    logger.error(`JobQueue: Failed job ${jobId}:`, error);
  }
}

/**
 * Remove a job from the queue by ID.
 * 
 * @param jobId - The job ID to remove
 */
export function removeJob(jobId: string): void {
  const index = _state.jobs.findIndex(j => j.id === jobId);
  if (index !== -1) {
    _state.jobs = [
      ..._state.jobs.slice(0, index),
      ..._state.jobs.slice(index + 1),
    ];
    updatePendingCount();
    
    logger.info(`JobQueue: Removed job ${jobId}`);
  }
}

/**
 * Clear all jobs from the queue.
 */
export function clearJobs(): void {
  _state.jobs = [];
  _state.currentJobId = null;
  _state.isProcessing = false;
  _state.totalProcessed = 0;
  _state.totalPending = 0;
  
  logger.info('JobQueue: Cleared all jobs');
}

/**
 * Reset the queue state.
 */
export function resetQueueState(): void {
  _state.jobs = [];
  _state.currentJobId = null;
  _state.isProcessing = false;
  _state.totalProcessed = 0;
  _state.totalPending = 0;
}
