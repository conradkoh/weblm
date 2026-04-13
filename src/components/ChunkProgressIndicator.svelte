<script lang="ts">
  /**
   * ChunkProgressIndicator - shows status icon for a chunk.
   * Used in ChunkList to display chunk progress state.
   */

  import type { ChunkPipelineStatus } from '../stores/types';

  interface Props {
    status: ChunkPipelineStatus;
    size?: 'sm' | 'md';
  }

  let { status, size = 'sm' }: Props = $props();

  const sizeClass = $derived(size === 'sm' ? 'w-3 h-3 text-[10px]' : 'w-4 h-4 text-xs');
  const dotSizeClass = $derived(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4');

  // Get status configuration
  const statusConfig = $derived.by(() => {
    switch (status) {
      case 'pending':
        return {
          icon: '○',
          color: 'text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          label: 'Pending',
        };
      case 'formatting':
        return {
          icon: '◐',
          color: 'text-blue-500',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'Formatting',
          pulse: true,
        };
      case 'formatted':
        return {
          icon: '✓',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'Formatted',
        };
      case 'analyzing':
        return {
          icon: '◐',
          color: 'text-amber-500',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'Analyzing',
          pulse: true,
        };
      case 'analyzed':
        return {
          icon: '✓',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'Analyzed',
        };
      case 'refining':
        return {
          icon: '◐',
          color: 'text-purple-500',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          label: 'Refining',
          pulse: true,
        };
      case 'refined':
        return {
          icon: '✓',
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          label: 'Refined',
        };
      case 'error':
        return {
          icon: '✗',
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'Error',
        };
      default:
        return {
          icon: '○',
          color: 'text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          label: 'Unknown',
        };
    }
  });
</script>

<span 
  class="inline-flex items-center justify-center rounded-full {dotSizeClass} {statusConfig.bgColor} {statusConfig.color} {sizeClass} font-bold"
  class:animate-pulse={statusConfig.pulse}
  title={statusConfig.label}
>
  {statusConfig.icon}
</span>
