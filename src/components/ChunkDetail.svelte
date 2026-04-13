<script lang="ts">
  /**
   * ChunkDetail panel for pipeline observability.
   * Displays all intermediate outputs of a selected chunk with tabbed interface.
   */

  import { renderMarkdown, renderPlainText } from '../lib/markdown';
  import type { ChunkPipelineData, CohesionAnalysis } from '../stores/types';

  interface Props {
    chunk: ChunkPipelineData;
    totalChunks: number;
    onNavigate: (direction: 'prev' | 'next') => void;
    onClose: () => void;
  }

  let { chunk, totalChunks, onNavigate, onClose }: Props = $props();

  type TabId = 'raw' | 'formatted' | 'analysis' | 'refined' | 'diff';
  let activeTab = $state<TabId>('raw');

  // Compute cohesion badge info
  function getCohesionBadge(analysis: CohesionAnalysis | null): {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  } {
    if (!analysis || !analysis.hasIssues) {
      return {
        label: 'No issues',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: '✓',
      };
    }

    // Check if any high severity issues
    const hasHighSeverity = analysis.issues.some(i => i.severity === 'high');
    if (hasHighSeverity) {
      return {
        label: 'Major issues',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        icon: '✗',
      };
    }

    // Medium or low severity
    return {
      label: 'Minor issues',
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      icon: '⚠',
    };
  }

  // Simple line-by-line diff computation
  interface DiffLine {
    type: 'unchanged' | 'added' | 'removed';
    text: string;
    lineNum: number;
  }

  interface DiffResult {
    left: DiffLine[];
    right: DiffLine[];
  }

  function computeDiff(formatted: string | null, refined: string | null): DiffResult {
    const formattedLines = (formatted ?? '').split('\n');
    const refinedLines = (refined ?? '').split('\n');
    
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];
    
    // Simple LCS-based diff (Longest Common Subsequence)
    const lcs = computeLCS(formattedLines, refinedLines);
    
    let fIdx = 0;
    let rIdx = 0;
    let lcsIdx = 0;
    let leftLineNum = 1;
    let rightLineNum = 1;
    
    while (fIdx < formattedLines.length || rIdx < refinedLines.length) {
      if (lcsIdx < lcs.length && fIdx < formattedLines.length && rIdx < refinedLines.length
          && formattedLines[fIdx] === lcs[lcsIdx] && refinedLines[rIdx] === lcs[lcsIdx]) {
        // Lines are the same
        left.push({ type: 'unchanged', text: formattedLines[fIdx]!, lineNum: leftLineNum++ });
        right.push({ type: 'unchanged', text: refinedLines[rIdx]!, lineNum: rightLineNum++ });
        fIdx++;
        rIdx++;
        lcsIdx++;
      } else if (lcsIdx < lcs.length && fIdx < formattedLines.length && formattedLines[fIdx] === lcs[lcsIdx]) {
        // Line removed from formatted
        left.push({ type: 'removed', text: formattedLines[fIdx]!, lineNum: leftLineNum++ });
        right.push({ type: 'unchanged', text: '', lineNum: -1 });
        fIdx++;
      } else if (lcsIdx < lcs.length && rIdx < refinedLines.length && refinedLines[rIdx] === lcs[lcsIdx]) {
        // Line added in refined
        left.push({ type: 'unchanged', text: '', lineNum: -1 });
        right.push({ type: 'added', text: refinedLines[rIdx]!, lineNum: rightLineNum++ });
        rIdx++;
      } else if (fIdx < formattedLines.length && rIdx < refinedLines.length) {
        // Both changed or one side changed
        left.push({ type: 'removed', text: formattedLines[fIdx]!, lineNum: leftLineNum++ });
        right.push({ type: 'added', text: refinedLines[rIdx]!, lineNum: rightLineNum++ });
        fIdx++;
        rIdx++;
      } else if (fIdx < formattedLines.length) {
        left.push({ type: 'removed', text: formattedLines[fIdx]!, lineNum: leftLineNum++ });
        right.push({ type: 'unchanged', text: '', lineNum: -1 });
        fIdx++;
      } else if (rIdx < refinedLines.length) {
        left.push({ type: 'unchanged', text: '', lineNum: -1 });
        right.push({ type: 'added', text: refinedLines[rIdx]!, lineNum: rightLineNum++ });
        rIdx++;
      }
    }
    
    return { left, right };
  }

  function computeLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i]![j] = (dp[i - 1]![j - 1] ?? 0) + 1;
        } else {
          dp[i]![j] = Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
        }
      }
    }
    
    const result: string[] = [];
    let i = m;
    let j = n;
    
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift(a[i - 1]!);
        i--;
        j--;
      } else if ((dp[i - 1]![j] ?? 0) > (dp[i]![j - 1] ?? 0)) {
        i--;
      } else {
        j--;
      }
    }
    
    return result;
  }

  const diffResult = $derived(computeDiff(chunk.formattedText, chunk.refinedText));
  const prevBadge = $derived(getCohesionBadge(chunk.cohesionWithPrev));
  const nextBadge = $derived(getCohesionBadge(chunk.cohesionWithNext));
</script>

<div class="flex flex-col h-full max-h-[500px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-t-lg">
    <div class="flex items-center gap-3">
      <span class="font-semibold text-sm text-gray-700 dark:text-slate-200">
        Chunk {chunk.index + 1} of {totalChunks}
      </span>
      <span class="text-xs text-gray-500 dark:text-slate-400">
        {chunk.rawTokenCount} tokens
      </span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={chunk.index === 0}
        onclick={() => onNavigate('prev')}
        title="Previous chunk"
      >
        ◀
      </button>
      <button
        type="button"
        class="px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={chunk.index === totalChunks - 1}
        onclick={() => onNavigate('next')}
        title="Next chunk"
      >
        ▶
      </button>
      <button
        type="button"
        class="ml-2 px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-slate-700"
        onclick={onClose}
        title="Close panel"
      >
        ✕
      </button>
    </div>
  </div>

  <!-- Tab Bar -->
  <div class="flex border-b border-gray-200 dark:border-slate-700">
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium transition-colors
        {activeTab === 'raw' 
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
        }"
      onclick={() => activeTab = 'raw'}
    >
      Raw
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium transition-colors
        {activeTab === 'formatted' 
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
        }"
      onclick={() => activeTab = 'formatted'}
    >
      Formatted
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium transition-colors
        {activeTab === 'analysis' 
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
        }"
      onclick={() => activeTab = 'analysis'}
    >
      Analysis
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium transition-colors
        {activeTab === 'refined' 
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
        }"
      onclick={() => activeTab = 'refined'}
    >
      Refined
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium transition-colors
        {activeTab === 'diff' 
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
        }"
      onclick={() => activeTab = 'diff'}
    >
      Diff
    </button>
  </div>

  <!-- Content Area -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if activeTab === 'raw'}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-slate-400">Raw Input</span>
          <span class="text-xs text-gray-400 dark:text-slate-500">{chunk.rawTokenCount} tokens</span>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md font-mono text-sm whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
          {chunk.rawText}
        </div>
      </div>

    {:else if activeTab === 'formatted'}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-slate-400">Formatted Output</span>
          {#if chunk.formattedAt}
            <span class="text-xs text-gray-400 dark:text-slate-500">
              {new Date(chunk.formattedAt).toLocaleTimeString()}
            </span>
          {/if}
        </div>
        {#if chunk.formattedText}
          <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md prose prose-sm dark:prose-invert max-h-[300px] overflow-y-auto">
            {@html renderMarkdown(chunk.formattedText)}
          </div>
        {:else}
          <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-400 dark:text-slate-500 text-sm">
            {#if chunk.status === 'pending' || chunk.status === 'formatting'}
              Formatting in progress...
            {:else}
              Not yet formatted
            {/if}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'analysis'}
      <div class="space-y-4">
        <!-- With previous chunk -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500 dark:text-slate-400">With Previous Chunk</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium {prevBadge.bgColor} {prevBadge.color}">
              {prevBadge.icon} {prevBadge.label}
            </span>
          </div>
          {#if chunk.cohesionWithPrev}
            <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md text-sm whitespace-pre-wrap break-words">
              {chunk.cohesionWithPrev.summary}
            </div>
            {#if chunk.cohesionWithPrev.issues.length > 0}
              <div class="mt-2 space-y-1">
                {#each chunk.cohesionWithPrev.issues as issue}
                  <div class="flex items-start gap-2 text-xs">
                    <span class="shrink-0">
                      {#if issue.severity === 'high'}
                        🔴
                      {:else if issue.severity === 'medium'}
                        ⚠️
                      {:else}
                        💡
                      {/if}
                    </span>
                    <span class="text-gray-600 dark:text-slate-300">
                      <strong class="capitalize">{issue.type.replace('_', ' ')}:</strong> {issue.description}
                      {#if issue.suggestion}
                        <em class="text-gray-500 dark:text-slate-400"> → {issue.suggestion}</em>
                      {/if}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          {:else}
            <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-400 dark:text-slate-500 text-sm">
              {#if chunk.index === 0}
                No previous chunk to analyze
              {:else}
                Analysis pending...
              {/if}
            </div>
          {/if}
        </div>

        <!-- With next chunk -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500 dark:text-slate-400">With Next Chunk</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium {nextBadge.bgColor} {nextBadge.color}">
              {nextBadge.icon} {nextBadge.label}
            </span>
          </div>
          {#if chunk.cohesionWithNext}
            <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md text-sm whitespace-pre-wrap break-words">
              {chunk.cohesionWithNext.summary}
            </div>
            {#if chunk.cohesionWithNext.issues.length > 0}
              <div class="mt-2 space-y-1">
                {#each chunk.cohesionWithNext.issues as issue}
                  <div class="flex items-start gap-2 text-xs">
                    <span class="shrink-0">
                      {#if issue.severity === 'high'}
                        🔴
                      {:else if issue.severity === 'medium'}
                        ⚠️
                      {:else}
                        💡
                      {/if}
                    </span>
                    <span class="text-gray-600 dark:text-slate-300">
                      <strong class="capitalize">{issue.type.replace('_', ' ')}:</strong> {issue.description}
                      {#if issue.suggestion}
                        <em class="text-gray-500 dark:text-slate-400"> → {issue.suggestion}</em>
                      {/if}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          {:else}
            <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-400 dark:text-slate-500 text-sm">
              {#if chunk.index === totalChunks - 1}
                No next chunk to analyze
              {:else}
                Analysis pending...
              {/if}
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'refined'}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-slate-400">Refined Output</span>
          <div class="flex items-center gap-2">
            {#if chunk.wasModified}
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                ✎ Modified
              </span>
            {/if}
            {#if chunk.refinedAt}
              <span class="text-xs text-gray-400 dark:text-slate-500">
                {new Date(chunk.refinedAt).toLocaleTimeString()}
              </span>
            {/if}
          </div>
        </div>
        {#if chunk.refinedText}
          <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md prose prose-sm dark:prose-invert max-h-[300px] overflow-y-auto">
            {@html renderMarkdown(chunk.refinedText)}
          </div>
        {:else}
          <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-400 dark:text-slate-500 text-sm">
            {#if chunk.status === 'refining'}
              Refinement in progress...
            {:else}
              Not yet refined
            {/if}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'diff'}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-slate-400">
            Changes: Formatted → Refined
          </span>
          {#if chunk.wasModified}
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {diffResult.right.filter(l => l.type === 'added').length} additions, {diffResult.left.filter(l => l.type === 'removed').length} removals
            </span>
          {:else}
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              No changes
            </span>
          {/if}
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs font-mono max-h-[300px] overflow-y-auto">
          <div class="space-y-0.5">
            <div class="px-2 py-1 bg-gray-100 dark:bg-slate-800 font-medium text-gray-500 dark:text-slate-400 sticky top-0">
              Formatted
            </div>
            {#each diffResult.left as line}
              <div class="px-2 py-0.5 break-all
                {line.type === 'removed' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : ''}
                {line.type === 'unchanged' ? 'text-gray-600 dark:text-slate-400' : ''}
              ">
                {#if line.type === 'removed'}
                  <span class="text-red-500">-</span>
                {/if}
                {line.text || '\u00A0'}
              </div>
            {/each}
          </div>
          <div class="space-y-0.5">
            <div class="px-2 py-1 bg-gray-100 dark:bg-slate-800 font-medium text-gray-500 dark:text-slate-400 sticky top-0">
              Refined
            </div>
            {#each diffResult.right as line}
              <div class="px-2 py-0.5 break-all
                {line.type === 'added' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : ''}
                {line.type === 'unchanged' ? 'text-gray-600 dark:text-slate-400' : ''}
              ">
                {#if line.type === 'added'}
                  <span class="text-green-500">+</span>
                {/if}
                {line.text || '\u00A0'}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
