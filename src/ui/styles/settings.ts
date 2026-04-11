/**
 * Settings component CSS styles.
 */

export const settingsStyles = `
    /* Settings */
    .settings-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 18px;
      background-color: transparent;
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .settings-button:hover {
      background-color: var(--color-surface);
    }

    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .settings-panel {
      background-color: var(--color-background);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-md);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
    }

    .settings-header h2 {
      margin: 0;
      font-size: var(--font-size-lg);
    }

    .settings-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 18px;
      background-color: transparent;
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      color: var(--color-text-secondary);
    }

    .settings-close:hover {
      background-color: var(--color-surface);
      color: var(--color-text);
    }

    .settings-content {
      padding: var(--spacing-md);
    }

    .settings-section {
      margin-bottom: var(--spacing-lg);
    }

    .settings-section h3 {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
    }

    .settings-note {
      padding: var(--spacing-sm);
      background-color: var(--color-surface);
      border-radius: var(--border-radius);
    }

    .settings-note .note {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    /* Settings - Generation controls */
    .setting-row {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
    }

    .setting-row label {
      font-weight: 500;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .setting-row input[type="range"] {
      width: 100%;
      margin: var(--spacing-xs) 0;
    }

    .setting-row input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
    }

    .setting-hint {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      font-style: italic;
    }

    /* Settings - System prompt */
    #system-prompt-input {
      width: 100%;
      padding: var(--spacing-sm);
      font-size: var(--font-size-base);
      font-family: inherit;
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
      resize: vertical;
      min-height: 60px;
      background-color: var(--color-background);
      color: var(--color-text);
    }

    #system-prompt-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    /* Settings - Theme */
    .theme-options {
      display: flex;
      gap: var(--spacing-sm);
    }

    .theme-option {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-sm);
      border: 2px solid var(--color-border);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .theme-option:hover {
      border-color: var(--color-primary);
    }

    .theme-option.selected {
      border-color: var(--color-primary);
      background-color: var(--color-surface);
    }

    .theme-option input {
      display: none;
    }

    .theme-label {
      font-size: var(--font-size-sm);
      font-weight: 500;
    }

    /* Settings - Export */
    .export-buttons {
      display: flex;
      gap: var(--spacing-sm);
    }

    .export-buttons button {
      flex: 1;
    }

    /* Settings - Checkbox */
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      cursor: pointer;
      font-weight: 500;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    /* Storage bar */
    .storage-bar {
      height: 8px;
      background-color: var(--color-border);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: var(--spacing-sm);
    }

    .storage-bar-fill {
      height: 100%;
      background-color: var(--color-primary);
      transition: width 0.3s ease;
    }

    .storage-text {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    /* Memory info */
    .memory-status {
      font-size: var(--font-size-sm);
    }

    .memory-status p {
      margin: 0 0 var(--spacing-xs) 0;
    }

    .memory-recommendation {
      color: var(--color-text-secondary);
    }
`;