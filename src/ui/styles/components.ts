/**
 * Component CSS styles - Status bar, progress, model selector, buttons, markdown, etc.
 */

export const componentStyles = `
    /* Status indicator styles */
    .status-bar {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.success {
      background-color: var(--color-success);
    }

    .status-dot.error {
      background-color: var(--color-error);
    }

    .status-dot.loading {
      background-color: var(--color-text-secondary);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Main content */
    .main-content {
      flex: 1;
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .title {
      font-size: var(--font-size-xl);
      font-weight: 600;
      margin-bottom: var(--spacing-md);
    }

    .description {
      color: var(--color-text-secondary);
      text-align: center;
      max-width: 500px;
    }

    .error-message {
      background-color: #fef2f2;
      border: 1px solid var(--color-error);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      margin-top: var(--spacing-lg);
      max-width: 500px;
    }

    .error-message h3 {
      color: var(--color-error);
      margin-bottom: var(--spacing-sm);
    }

    .error-message ul {
      margin-left: var(--spacing-md);
      margin-top: var(--spacing-sm);
    }

    .error-message li {
      color: var(--color-text-secondary);
      margin: var(--spacing-xs) 0;
    }

    /* Button styles */
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
      font-weight: 500;
      font-family: inherit;
      line-height: 1.5;
      color: white;
      background-color: var(--color-primary);
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.1s ease;
    }

    .button:hover {
      background-color: #4338ca;
    }

    .button:active {
      transform: scale(0.98);
    }

    .button:disabled {
      background-color: var(--color-text-secondary);
      cursor: not-allowed;
      opacity: 0.7;
    }

    .button-secondary {
      background-color: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    .button-secondary:hover {
      background-color: var(--color-border);
    }

    .button-danger {
      background-color: var(--color-error);
    }

    .button-danger:hover {
      background-color: #dc2626;
    }

    /* Progress bar styles */
    .progress-container {
      width: 100%;
      max-width: 500px;
      margin-top: var(--spacing-lg);
      padding: var(--spacing-lg);
      background-color: var(--color-surface);
      border-radius: var(--border-radius);
      border: 1px solid var(--color-border);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);
    }

    .progress-phase {
      font-size: var(--font-size-sm);
      color: var(--color-text);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .progress-percent {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-primary);
      margin-left: var(--spacing-sm);
    }

    .progress-bar-outer {
      width: 100%;
      height: 8px;
      background-color: var(--color-border);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-inner {
      height: 100%;
      background-color: var(--color-primary);
      border-radius: 4px;
      transition: width 0.2s ease;
    }

    .progress-time {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-sm);
    }

    .progress-error {
      margin-top: var(--spacing-md);
      padding: var(--spacing-md);
      background-color: #fef2f2;
      border: 1px solid var(--color-error);
      border-radius: var(--border-radius);
    }

    .progress-error .error-message {
      margin: 0 0 var(--spacing-sm) 0;
      padding: 0;
      background: none;
      border: none;
      color: var(--color-error);
    }

    .retry-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: 500;
      font-family: inherit;
      color: var(--color-error);
      background-color: white;
      border: 1px solid var(--color-error);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .retry-button:hover {
      background-color: #fef2f2;
    }

    /* Model selector */
    .model-selector {
      margin-top: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      width: 100%;
      max-width: 400px;
    }

    .model-option {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-md);
      border: 2px solid var(--color-border);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .model-option:hover {
      border-color: var(--color-primary);
      background-color: var(--color-surface);
    }

    .model-option.selected {
      border-color: var(--color-primary);
      background-color: #eef2ff;
    }

    .model-option-name {
      font-weight: 600;
      color: var(--color-text);
    }

    .model-option-info {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
    }

    .model-option-status {
      font-size: var(--font-size-sm);
      color: var(--color-success);
      margin-top: var(--spacing-xs);
    }

    /* Model card */
    .model-card {
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      margin-bottom: var(--spacing-sm);
      transition: border-color 0.15s ease;
    }

    .model-card:hover {
      border-color: var(--color-primary);
    }

    .model-card.current {
      border-color: var(--color-success);
      background-color: #f0fdf4;
    }

    .model-card.cached:not(.current) {
      border-color: var(--color-primary);
    }

    .model-card-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xs);
    }

    .model-name {
      font-weight: 600;
      color: var(--color-text);
    }

    .model-badge {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }

    .current-badge {
      background-color: var(--color-success);
      color: white;
    }

    .cached-badge {
      background-color: var(--color-primary);
      color: white;
    }

    .model-card-info {
      display: flex;
      gap: var(--spacing-md);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .model-card-actions {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .model-action-label {
      font-size: var(--font-size-sm);
      color: var(--color-success);
    }

    .model-switch-btn {
      font-size: var(--font-size-sm);
    }

    .model-clear-btn {
      font-size: var(--font-size-sm);
    }

    /* Markdown content styles */
    .chat-content h1 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 0.5em 0 0.25em;
    }

    .chat-content h2 {
      font-size: 1.3em;
      font-weight: 600;
      margin: 0.5em 0 0.25em;
    }

    .chat-content h3 {
      font-size: 1.1em;
      font-weight: 600;
      margin: 0.5em 0 0.25em;
    }

    .chat-content p {
      margin: 0.5em 0;
      line-height: 1.6;
    }

    .chat-content ul, .chat-content ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    .chat-content li {
      margin: 0.25em 0;
    }

    .chat-content blockquote {
      margin: 0.5em 0;
      padding: 0.5em 1em;
      border-left: 3px solid var(--color-primary);
      background-color: var(--color-surface);
      border-radius: 0 var(--border-radius) var(--border-radius) 0;
    }

    .chat-content .inline-code {
      font-family: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
      font-size: 0.9em;
      background-color: var(--color-surface);
      padding: 0.1em 0.4em;
      border-radius: 3px;
      border: 1px solid var(--color-border);
    }

    .chat-content a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .chat-content a:hover {
      text-decoration: underline;
    }

    .chat-content hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: 1em 0;
    }

    .chat-content strong {
      font-weight: 600;
    }

    .chat-content em {
      font-style: italic;
    }

    /* Code block styles */
    .code-block {
      margin: 0.75em 0;
      border-radius: var(--border-radius);
      overflow: hidden;
      border: 1px solid var(--color-border);
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .code-lang {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-transform: uppercase;
    }

    .code-block pre {
      margin: 0;
      padding: 12px;
      background-color: #f6f8fa;
      overflow-x: auto;
    }

    .code-block code {
      font-family: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre;
    }

    /* Simple syntax highlighting */
    .hl-keyword { color: #cf222e; font-weight: 500; }
    .hl-string { color: #0a3069; }
    .hl-comment { color: #6e7781; font-style: italic; }
    .hl-number { color: #0550ae; }
    .hl-function { color: #8250df; }

    /* New Chat button */
    .new-chat-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 4px 12px;
      font-size: var(--font-size-sm);
      font-weight: 500;
      font-family: inherit;
      color: var(--color-text-secondary);
      background-color: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .new-chat-btn:hover {
      background-color: var(--color-surface);
      color: var(--color-text);
      border-color: var(--color-primary);
    }

    .new-chat-btn:active {
      transform: scale(0.98);
    }

    /* Message metrics */
    .message-metrics {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-xs);
      font-size: 11px;
      color: var(--color-text-secondary);
      opacity: 0.7;
    }

    .message-metrics .metric {
      padding: 2px 6px;
      background-color: var(--color-surface);
      border-radius: 4px;
      border: 1px solid var(--color-border);
    }

    /* Loading spinner */
    .loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* ─── Launcher screen ──────────────────────────────── */

    .launcher-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: var(--spacing-xl) var(--spacing-lg);
    }

    .launcher-card {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .launcher-hero {
      text-align: center;
      padding-bottom: var(--spacing-sm);
    }

    .launcher-logo {
      font-size: 3rem;
      line-height: 1;
      margin-bottom: var(--spacing-sm);
    }

    .launcher-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 var(--spacing-xs) 0;
    }

    .launcher-subtitle {
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .launcher-storage {
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      opacity: 0.8;
      margin-top: calc(-1 * var(--spacing-md));
    }

    /* Selector within launcher */
    .launcher-selector {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .launcher-select-label {
      font-weight: 600;
      color: var(--color-text);
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .launcher-select {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
      color: var(--color-text);
      background-color: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--border-radius);
      cursor: pointer;
      appearance: auto;
      transition: border-color 0.15s ease;
    }

    .launcher-select:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .launcher-select:hover {
      border-color: var(--color-primary);
    }

    /* Detail panel */
    .launcher-detail-panel {
      min-height: 80px;
      padding: var(--spacing-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
      font-size: var(--font-size-sm);
    }

    .launcher-detail-placeholder {
      color: var(--color-text-secondary);
      text-align: center;
      margin: 0;
      padding: var(--spacing-sm) 0;
    }

    .launcher-detail-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .launcher-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .launcher-detail-label {
      color: var(--color-text-secondary);
      flex-shrink: 0;
    }

    .launcher-detail-value {
      color: var(--color-text);
      font-weight: 500;
      text-align: right;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .launcher-family-desc {
      font-style: italic;
      font-weight: 400;
      color: var(--color-text-secondary);
    }

    .launcher-tag {
      display: inline-block;
      padding: 2px 8px;
      background-color: var(--color-primary);
      color: white;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }

    .launcher-cached-row {
      margin-top: var(--spacing-xs);
    }

    .launcher-cached-badge {
      display: inline-block;
      padding: 3px 10px;
      background-color: var(--color-success);
      color: white;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Load button */
    .launcher-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .launcher-load-btn {
      width: 100%;
      padding: var(--spacing-md) var(--spacing-lg);
      font-size: var(--font-size-base);
      font-weight: 600;
    }
`;
