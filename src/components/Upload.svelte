<script lang="ts">
  /**
   * Upload component.
   * File upload button with drag-and-drop overlay.
   */

  import type { UploadedFile } from '../stores/types';
  import { Button } from '$ui/button';

  const SUPPORTED_TYPES = ['.txt', '.md', '.csv', '.json'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  export type { UploadedFile };

  interface Props {
    uploadedFile?: UploadedFile | null;
    onFileLoaded: (file: UploadedFile) => void;
    onFileClear: () => void;
  }

  let { uploadedFile = null, onFileLoaded, onFileClear }: Props = $props();

  let isDragging = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();
  let errorMessage: string | null = $state(null);
  let errorTimer: ReturnType<typeof setTimeout> | null = null;

  function showError(msg: string): void {
    errorMessage = msg;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = setTimeout(() => { errorMessage = null; }, 4000);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processFile(file);
    input.value = '';
  }

  function handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    isDragging = true;
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    isDragging = false;
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  function processFile(file: File): void {
    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_TYPES.includes(ext)) {
      showError(`Unsupported file type. Supported: ${SUPPORTED_TYPES.join(', ')}`);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      showError(`File too large. Maximum size is 5MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoaded({
        name: file.name,
        content,
        size: file.size,
        type: file.type,
      });
    };
    reader.onerror = () => {
      showError('Failed to read file.');
    };
    reader.readAsText(file);
  }
</script>

<!-- Upload button -->
<Button
  variant="ghost"
  size="icon"
  title="Upload file"
  aria-label="Upload file"
  onclick={() => fileInputEl?.click()}
>
  📎
</Button>

<!-- Hidden file input (native — no shadcn equivalent) -->
<input
  type="file"
  accept={SUPPORTED_TYPES.join(',')}
  style="display: none"
  aria-label="File upload input"
  bind:this={fileInputEl}
  onchange={handleFileInput}
/>

<!-- File info bar (when a file is loaded) -->
{#if uploadedFile}
  <div
    class="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-2"
    aria-live="polite"
  >
    <div class="flex items-center gap-2">
      <span class="text-xl">📄</span>
      <div class="flex-1 flex flex-col gap-0.5">
        <span class="font-semibold text-gray-900 dark:text-slate-100 text-sm">{uploadedFile.name}</span>
        <span class="text-gray-500 dark:text-slate-400 text-[12px]">{formatSize(uploadedFile.size)}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="w-6 h-6 p-0 hover:bg-red-500 hover:text-white"
        aria-label="Remove file"
        onclick={onFileClear}
      >✕</Button>
    </div>
  </div>
{/if}

<!-- Error toast -->
{#if errorMessage}
  <div
    class="bg-red-500 text-white px-3 py-2 rounded-lg text-sm shadow-md mt-1"
    role="alert"
  >{errorMessage}</div>
{/if}

<!-- Drag-and-drop overlay (custom — no shadcn equivalent) -->
{#if isDragging}
  <div
    class="fixed inset-0 bg-indigo-600/10 flex items-center justify-center z-[1000]"
    role="region"
    aria-label="Drop zone for file upload"
    ondragover={handleDragOver}
    ondrop={handleDrop}
    ondragleave={handleDragLeave}
  >
    <div class="bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-600 rounded-lg p-8 text-center pointer-events-none">
      <div class="text-5xl mb-4">📄</div>
      <div class="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Drop file here</div>
      <div class="text-sm text-gray-500 dark:text-slate-400">Supported: {SUPPORTED_TYPES.join(', ')} (max 5MB)</div>
    </div>
  </div>
{/if}

<svelte:window ondragenter={handleDragEnter} />
