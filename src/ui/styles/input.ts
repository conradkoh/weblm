/**
 * Input component CSS styles.
 */

export const inputStyles = `
    /* Input area */
    .input-container {
      display: flex;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background-color: var(--color-surface);
      border-top: 1px solid var(--color-border);
    }

    .input-textarea {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
      font-family: inherit;
      line-height: 1.5;
      color: var(--color-text);
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
      resize: none;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .input-textarea:focus {
      border-color: var(--color-primary);
    }

    .input-textarea:disabled {
      background-color: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: not-allowed;
    }

    .input-textarea::placeholder {
      color: var(--color-text-secondary);
    }

    .input-buttons {
      display: flex;
      gap: var(--spacing-sm);
      align-items: flex-end;
    }

    /* Upload styles */
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
    }

    .upload-button:hover {
      background-color: var(--color-surface);
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
      pointer-events: auto;
    }

    .drop-zone-content {
      background-color: var(--color-background);
      border: 2px dashed var(--color-primary);
      border-radius: var(--border-radius);
      padding: var(--spacing-xl);
      text-align: center;
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

    .file-info-preview {
      margin-top: var(--spacing-xs);
      padding-top: var(--spacing-xs);
      border-top: 1px solid var(--color-border);
      font-size: 12px;
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .error-toast {
      background-color: var(--color-error);
      color: white;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      font-size: var(--font-size-sm);
      box-shadow: var(--shadow-md);
    }
`;