<script lang="ts">
  /**
   * PhaseTransitionBanner component.
   * Shows current phase, progress, and estimated time remaining.
   * Includes animated phase dot indicators.
   */
  
  interface PhaseInfo {
    name: string;
    status: 'completed' | 'active' | 'pending';
  }
  
  interface Props {
    currentPhase: string;
    currentStep: number;
    totalSteps: number;
    estimatedTimeRemaining: number | null;
    phases?: PhaseInfo[];
  }
  
  let { 
    currentPhase, 
    currentStep, 
    totalSteps, 
    estimatedTimeRemaining,
    phases = []
  }: Props = $props();
  
  // Format time for display
  function formatETA(ms: number | null): string {
    if (ms === null || ms <= 0) return '';
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `~${seconds}s remaining`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 
        ? `~${minutes}m ${remainingSeconds}s remaining` 
        : `~${minutes}m remaining`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `~${hours}h ${remainingMinutes}m remaining`;
  }
  
  const etaString = $derived(formatETA(estimatedTimeRemaining));
  const progressPercent = $derived(totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0);
</script>

<div class="flex flex-col gap-2 px-1">
  <!-- Phase name and progress -->
  <div class="flex items-center justify-between text-sm">
    <div class="flex items-center gap-2">
      <span class="font-medium text-gray-700 dark:text-slate-300">
        {currentPhase}
      </span>
      <span class="text-gray-500 dark:text-slate-400">
        {currentStep}/{totalSteps}
      </span>
    </div>
    {#if etaString}
      <span class="text-xs text-gray-500 dark:text-slate-400">
        {etaString}
      </span>
    {/if}
  </div>
  
  <!-- Phase indicators (if provided) -->
  {#if phases.length > 0}
    <div class="flex items-center gap-1.5">
      {#each phases as phase}
        <div 
          class="h-1.5 rounded-full transition-all duration-300 flex-1"
          class:bg-green-500={phase.status === 'completed'}
          class:bg-indigo-500={phase.status === 'active'}
          class:bg-gray-300={phase.status === 'pending'}
          class:dark:bg-green-400={phase.status === 'completed'}
          class:dark:bg-indigo-400={phase.status === 'active'}
          class:dark:bg-slate-600={phase.status === 'pending'}
          class:animate-pulse={phase.status === 'active'}
        ></div>
      {/each}
    </div>
  {:else}
    <!-- Simple progress bar -->
    <div class="w-full h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
      <div 
        class="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300"
        style="width: {progressPercent}%"
      ></div>
    </div>
  {/if}
</div>
