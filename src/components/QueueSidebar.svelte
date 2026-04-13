<script lang="ts">
  /**
   * QueueSidebar component.
   * Right sidebar showing job queue with live streaming output.
   */
  import { Button } from '$ui/button';
  import { getJobQueueState, clearJobs } from '../stores/jobQueueStore.svelte';
  import type { Job, JobType, JobStatus } from '../stores/types';

  // Props for the sidebar
  interface Props {
    collapsed?: boolean;
    onToggle?: () => void;
  }

  let { collapsed = $bindable(false), onToggle }: Props = $props();

  const queueState = getJobQueueState();

  // Get job type badge info
  function getJobTypeBadge(type: JobType): { label: string; color: string } {
    switch (type) {
      case 'refine':
        return { label: 'Refine', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' };
      case 'extract':
        return { label: 'Extract', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' };
      case 'schema':
        return { label: 'Schema', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' };
      case 'structured-extract':
        return { label: 'Struct', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' };
      default:
        return { label: type, color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400' };
    }
  }

  // Get status badge info
  function getStatusBadge(status: JobStatus): { label: string; color: string; icon: string } {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', icon: '⏳' };
      case 'processing':
        return { label: 'Processing', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', icon: '⚡' };
      case 'completed':
        return { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400', icon: '✓' };
      case 'error':
        return { label: 'Error', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400', icon: '✗' };
      default:
        return { label: status, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', icon: '?' };
    }
  }

  // Format relative time
  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Get input preview (truncated first message)
  function getInputPreview(job: Job): string {
    if (!job.input.messages.length) return 'No input';
    const firstMsg = job.input.messages[0];
    if (!firstMsg?.content) return 'No content';
    const preview = firstMsg.content.slice(0, 50);
    return preview + (firstMsg.content.length > 50 ? '...' : '');
  }

  // Toggle expanded state for jobs
  let expandedJobId = $state<string | null>(null);

  function toggleJobExpand(jobId: string): void {
    expandedJobId = expandedJobId === jobId ? null : jobId;
  }

  // Get the current processing job
  const processingJob = $derived(
    queueState.jobs.find(j => j.status === 'processing')
  );

  // Stats
  const stats = $derived({
    pending: queueState.jobs.filter(j => j.status === 'pending').length,
    processing: queueState.jobs.filter(j => j.status === 'processing').length,
    completed: queueState.jobs.filter(j => j.status === 'completed').length,
    error: queueState.jobs.filter(j => j.status === 'error').length,
  });

  // Auto-scroll ref (using $state for reactivity with bind:this)
  let streamingRef = $state<HTMLDivElement | null>(null);

  // Auto-scroll when streaming text updates
  $effect(() => {
    if (processingJob?.streamingText && streamingRef) {
      streamingRef.scrollTop = streamingRef.scrollHeight;
    }
  });

  function handleClearAll(): void {
    clearJobs();
    expandedJobId = null;
  }
</script>

<!-- Sidebar container -->
<div 
  class="flex flex-col h-full bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 transition-all duration-200"
  style="width: {collapsed ? '48px' : '320px'}"
>
  <!-- Header -->
  <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700">
    {#if !collapsed}
      <h3 class="font-semibold text-sm text-gray-900 dark:text-slate-100">Job Queue</h3>
    {/if}
    <Button
      variant="ghost"
      size="sm"
      title={collapsed ? 'Expand queue' : 'Collapse queue'}
      onclick={onToggle}
    >
      {collapsed ? '▶' : '◀'}
    </Button>
  </div>

  {#if !collapsed}
    <!-- Stats bar -->
    <div class="flex items-center gap-2 px-3 py-2 text-xs border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
      {#if stats.processing > 0}
        <span class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
          {stats.processing} processing
        </span>
      {/if}
      {#if stats.pending > 0}
        <span class="text-gray-500 dark:text-slate-400">
          {stats.pending} pending
        </span>
      {/if}
      {#if stats.completed > 0}
        <span class="text-green-600 dark:text-green-400">
          {stats.completed} done
        </span>
      {/if}
      {#if stats.error > 0}
        <span class="text-red-600 dark:text-red-400">
          {stats.error} failed
        </span>
      {/if}
    </div>

    <!-- Live streaming section (when processing) -->
    {#if processingJob}
      <div class="border-b border-gray-200 dark:border-slate-700">
        <div class="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/50">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span class="text-xs font-medium text-blue-700 dark:text-blue-400">
              Streaming...
            </span>
          </div>
        </div>
        <div 
          bind:this={streamingRef}
          class="h-40 overflow-y-auto p-3 font-mono text-xs text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/50"
        >
          {#if processingJob.streamingText}
            {processingJob.streamingText}
          {:else}
            <span class="text-gray-400 dark:text-slate-500">Waiting for tokens...</span>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Job list -->
    <div class="flex-1 overflow-y-auto">
      {#if queueState.jobs.length === 0}
        <div class="flex items-center justify-center h-full text-sm text-gray-500 dark:text-slate-400 p-4">
          No jobs in queue
        </div>
      {:else}
        {#each queueState.jobs as job (job.id)}
          {@const typeBadge = getJobTypeBadge(job.type)}
          {@const statusBadge = getStatusBadge(job.status)}
          {@const isExpanded = expandedJobId === job.id}
          {@const isProcessing = job.status === 'processing'}
          
          <button
            type="button"
            class="w-full text-left border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors {isProcessing ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
            onclick={() => toggleJobExpand(job.id)}
          >
            <div class="px-3 py-2">
              <!-- Header row -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded {typeBadge.color}">
                    {typeBadge.label}
                  </span>
                  <span class="text-xs px-1.5 py-0.5 rounded {statusBadge.color}">
                    {statusBadge.icon} {statusBadge.label}
                  </span>
                </div>
                <span class="text-xs text-gray-400 dark:text-slate-500">
                  {formatRelativeTime(job.createdAt)}
                </span>
              </div>
              
              <!-- Preview -->
              <p class="mt-1 text-xs text-gray-600 dark:text-slate-400 truncate">
                {getInputPreview(job)}
              </p>

              <!-- Error message (if expanded and error) -->
              {#if isExpanded && job.error}
                <p class="mt-1 text-xs text-red-600 dark:text-red-400">
                  Error: {job.error}
                </p>
              {/if}

              <!-- Output preview (if completed) -->
              {#if isExpanded && job.output}
                <p class="mt-1 text-xs text-gray-500 dark:text-slate-500 truncate">
                  Output: {job.output.slice(0, 100)}{job.output.length > 100 ? '...' : ''}
                </p>
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Footer -->
    <div class="px-3 py-2 border-t border-gray-200 dark:border-slate-700">
      <Button
        variant="ghost"
        size="sm"
        class="w-full text-xs text-gray-500 dark:text-slate-400"
        onclick={handleClearAll}
        disabled={queueState.jobs.length === 0}
      >
        Clear All
      </Button>
    </div>
  {/if}
</div>
