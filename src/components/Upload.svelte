<script lang="ts">
  /**
   * Upload component.
   * File upload button with drag-and-drop overlay.
   */

  const SUPPORTED_TYPES = ['.txt', '.md', '.csv', '.json'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  export interface UploadedFile {
    name: string;
    content: string;
    size: number;
    type: string;
  }

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
<button
  class="upload-button"
  title="Upload file"
  aria-label="Upload file"
  onclick={() => fileInputEl?.click()}
>
  📎
</button>

<!-- Hidden file input -->
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
  <div class="file-info" aria-live="polite">
    <div class="file-info-content">
      <span class="file-info-icon">📄</span>
      <div class="file-info-details">
        <span class="file-info-name">{uploadedFile.name}</span>
        <span class="file-info-size">{formatSize(uploadedFile.size)}</span>
      </div>
      <button
        class="file-remove-button"
        aria-label="Remove file"
        onclick={onFileClear}
      >✕</button>
    </div>
  </div>
{/if}

<!-- Error toast -->
{#if errorMessage}
  <div class="error-toast" role="alert">{errorMessage}</div>
{/if}

<!-- Drag-and-drop overlay (portal-like, attached to body via onmount?) -->
<!-- We handle dragenter/dragleave/drop via event delegation on the parent chat area -->
<!-- The overlay is shown conditionally -->
{#if isDragging}
  <div
    class="drop-zone"
    aria-label="Drop zone for file upload"
    ondragover={handleDragOver}
    ondrop={handleDrop}
    ondragleave={handleDragLeave}
  >
    <div class="drop-zone-content">
      <div class="drop-zone-icon">📄</div>
      <div class="drop-zone-text">Drop file here</div>
      <div class="drop-zone-hint">Supported: {SUPPORTED_TYPES.join(', ')} (max 5MB)</div>
    </div>
  </div>
{/if}

<svelte:window ondragenter={handleDragEnter} />

<style>
  .upload-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    font-size: 18px;
    background-color: transparent;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.15s ease;
    flex-shrink: 0;
  }

  .upload-button:hover {
    background-color: var(--color-surface);
  }

  .file-info {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-sm);
  }

  .file-info-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .file-info-icon {
    font-size: 20px;
  }

  .file-info-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-info-name {
    font-weight: 600;
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .file-info-size {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  .file-remove-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background-color: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: 16px;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .file-remove-button:hover {
    background-color: var(--color-error);
    color: white;
  }

  .drop-zone {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(79, 70, 229, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .drop-zone-content {
    background-color: var(--color-background);
    border: 2px dashed var(--color-primary);
    border-radius: var(--border-radius);
    padding: var(--spacing-xl);
    text-align: center;
    pointer-events: none;
  }

  .drop-zone-icon {
    font-size: 48px;
    margin-bottom: var(--spacing-md);
  }

  .drop-zone-text {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--spacing-sm);
  }

  .drop-zone-hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .error-toast {
    background-color: var(--color-error);
    color: white;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    box-shadow: var(--shadow-md);
    margin-top: var(--spacing-xs);
  }
</style>
