/**
 * File upload component.
 *
 * Responsibilities:
 * - Drag-and-drop file upload
 * - File picker button
 * - File info display after upload
 * - File validation (type, size)
 * - Remove uploaded file
 */

/** Supported file types */
const SUPPORTED_TYPES = ['.txt', '.md', '.csv', '.json'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** Uploaded file info */
export interface UploadedFile {
  name: string;
  content: string;
  size: number;
  type: string;
}

/** Callback types */
export type FileLoadedCallback = (file: UploadedFile) => void;
export type FileClearCallback = () => void;

/** UI element references */
let dropZone: HTMLElement | null = null;
let fileInfo: HTMLElement | null = null;
let isDragging = false;

/**
 * Create the upload UI.
 */
export function createUploadUI(
  chatContainer: HTMLElement,
  inputContainer: HTMLElement,
  onFileLoaded: FileLoadedCallback,
  onFileClear: FileClearCallback
): { showDropZone: () => void; hideDropZone: () => void; setFileInfo: (file: UploadedFile) => void; clearFileInfo: () => void } {
  // Create drop zone overlay (hidden by default)
  dropZone = document.createElement('div');
  dropZone.className = 'drop-zone';
  dropZone.style.display = 'none';
  dropZone.innerHTML = `
    <div class="drop-zone-content">
      <div class="drop-zone-icon">📄</div>
      <div class="drop-zone-text">Drop file here</div>
      <div class="drop-zone-hint">Supported: ${SUPPORTED_TYPES.join(', ')} (max 5MB)</div>
    </div>
  `;
  chatContainer.parentElement?.appendChild(dropZone);

  // Create file info container (for input area)
  fileInfo = document.createElement('div');
  fileInfo.className = 'file-info';
  fileInfo.style.display = 'none';
  inputContainer.insertBefore(fileInfo, inputContainer.firstChild);

  // Create upload button
  const uploadButton = document.createElement('button');
  uploadButton.className = 'upload-button';
  uploadButton.innerHTML = '📎';
  uploadButton.title = 'Upload file';
  inputContainer.appendChild(uploadButton);

  // Hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = SUPPORTED_TYPES.join(',');
  fileInput.style.display = 'none';
  inputContainer.appendChild(fileInput);

  // Event handlers
  uploadButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files[0]) {
      handleFile(files[0], onFileLoaded);
    }
    fileInput.value = ''; // Reset input
  });

  // Drag and drop handlers on chat container
  chatContainer.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      isDragging = true;
      showDropZoneInternal();
    }
  });

  chatContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  chatContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = chatContainer.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      isDragging = false;
      hideDropZoneInternal();
    }
  });

  chatContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    hideDropZoneInternal();

    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      handleFile(files[0], onFileLoaded);
    }
  });

  // Drop zone handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    hideDropZoneInternal();

    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      handleFile(files[0], onFileLoaded);
    }
  });

  return {
    showDropZone: showDropZoneInternal,
    hideDropZone: hideDropZoneInternal,
    setFileInfo: (file: UploadedFile) => setFileInfoInternal(file, onFileClear),
    clearFileInfo: () => clearFileInfoInternal(),
  };
}

/**
 * Handle file selection.
 */
function handleFile(file: File, onFileLoaded: FileLoadedCallback): void {
  // Validate file type
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED_TYPES.includes(ext)) {
    showError(`Unsupported file type. Supported: ${SUPPORTED_TYPES.join(', ')}`);
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    showError(`File too large. Maximum size: 5MB. Your file: ${formatSize(file.size)}`);
    return;
  }

  // Read file
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    onFileLoaded({
      name: file.name,
      content,
      size: file.size,
      type: ext,
    });
  };
  reader.onerror = () => {
    showError('Failed to read file. Please try again.');
  };
  reader.readAsText(file);
}

/**
 * Show error message.
 */
function showError(message: string): void {
  // Create error toast
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Position at top center
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.zIndex = '1000';

  // Remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Format file size.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Show drop zone.
 */
function showDropZoneInternal(): void {
  if (dropZone) {
    dropZone.style.display = 'flex';
  }
}

/**
 * Hide drop zone.
 */
function hideDropZoneInternal(): void {
  if (dropZone) {
    dropZone.style.display = 'none';
  }
}

/**
 * Set file info display.
 */
function setFileInfoInternal(file: UploadedFile, onFileClear: FileClearCallback): void {
  if (!fileInfo) return;

  // Show preview of first 100 chars
  const preview = file.content.substring(0, 100).replace(/\n/g, ' ');
  const previewText = preview.length < file.content.length ? preview + '...' : preview;

  fileInfo.innerHTML = `
    <div class="file-info-content">
      <span class="file-info-icon">📄</span>
      <div class="file-info-details">
        <span class="file-info-name">${escapeHtml(file.name)}</span>
        <span class="file-info-size">${formatSize(file.size)}</span>
      </div>
      <button class="file-remove-button" title="Remove file">✕</button>
    </div>
    <div class="file-info-preview">${escapeHtml(previewText)}</div>
  `;
  fileInfo.style.display = 'block';

  // Add remove button handler
  const removeButton = fileInfo.querySelector('.file-remove-button');
  removeButton?.addEventListener('click', () => {
    clearFileInfoInternal();
    onFileClear();
  });
}

/**
 * Clear file info display.
 */
function clearFileInfoInternal(): void {
  if (fileInfo) {
    fileInfo.innerHTML = '';
    fileInfo.style.display = 'none';
  }
}

/**
 * Escape HTML for safe display.
 */
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}