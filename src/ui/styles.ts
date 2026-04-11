/**
 * CSS-in-JS styles for WebLM UI components.
 *
 * Responsibilities:
 * - Define CSS custom properties for theming
 * - Generate inline styles for components
 * - Support light/dark theme switching
 * - Responsive layout utilities
 */

/**
 * Theme colors for the application.
 */
export interface Theme {
  /** Primary accent color */
  primary: string;
  /** Background color */
  background: string;
  /** Surface/card background */
  surface: string;
  /** Text color */
  text: string;
  /** Secondary/muted text */
  textSecondary: string;
  /** Border color */
  border: string;
  /** Error color */
  error: string;
  /** Success color */
  success: string;
}

/**
 * Default light theme.
 */
export const lightTheme: Theme = {
  primary: '#4f46e5',
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#22c55e',
};

/**
 * Default dark theme.
 */
export const darkTheme: Theme = {
  primary: '#818cf8',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  error: '#f87171',
  success: '#4ade80',
};

/**
 * Apply theme to document root.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-background', theme.background);
  root.style.setProperty('--color-surface', theme.surface);
  root.style.setProperty('--color-text', theme.text);
  root.style.setProperty('--color-text-secondary', theme.textSecondary);
  root.style.setProperty('--color-border', theme.border);
  root.style.setProperty('--color-error', theme.error);
  root.style.setProperty('--color-success', theme.success);
}

/**
 * Apply theme by name (resolving 'system' preference).
 */
export function applyThemeByName(themeName: 'light' | 'dark' | 'system'): void {
  if (themeName === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? darkTheme : lightTheme);
  } else if (themeName === 'dark') {
    applyTheme(darkTheme);
  } else {
    applyTheme(lightTheme);
  }
}

/**
 * Setup system theme change listener.
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = () => {
    callback();
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * Generate a style string for inline application.
 */
export function createStyles(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/**
 * Inject global styles into the document.
 */
export function injectGlobalStyles(): void {
  // Only inject once
  if (document.getElementById('weblm-global-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'weblm-global-styles';
  styleElement.textContent = `
    /* CSS Reset */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --color-primary: #4f46e5;
      --color-background: #ffffff;
      --color-surface: #f9fafb;
      --color-text: #111827;
      --color-text-secondary: #6b7280;
      --color-border: #e5e7eb;
      --color-error: #ef4444;
      --color-success: #22c55e;
      
      --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      --font-size-base: 16px;
      --font-size-sm: 14px;
      --font-size-lg: 18px;
      --font-size-xl: 24px;
      
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;
      
      --border-radius: 8px;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    body {
      font-family: var(--font-family);
      font-size: var(--font-size-base);
      line-height: 1.5;
      color: var(--color-text);
      background-color: var(--color-background);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    #app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

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

    /* Chat container */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      overflow: hidden;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    /* Chat message bubbles */
    .chat-message {
      display: flex;
      max-width: 80%;
    }

    .chat-message-user {
      margin-left: auto;
    }

    .chat-message-assistant {
      margin-right: auto;
    }

    .chat-bubble {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      max-width: 100%;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .chat-message-user .chat-bubble {
      background-color: var(--color-primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .chat-message-assistant .chat-bubble {
      background-color: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-bottom-left-radius: 4px;
    }

    .chat-content {
      line-height: 1.5;
    }

    .chat-timestamp {
      font-size: 11px;
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
      opacity: 0.7;
    }

    .chat-message-user .chat-timestamp {
      color: rgba(255, 255, 255, 0.8);
      text-align: right;
    }

    /* Typing indicator */
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 4px 0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background-color: var(--color-text-secondary);
      border-radius: 50%;
      animation: typing-bounce 1.4s infinite ease-in-out both;
    }

    .typing-indicator span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes typing-bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

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

    /* Chat page layout */
    .chat-page {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: var(--spacing-md);
    }

    .input-container-wrapper {
      padding: var(--spacing-md);
      background-color: var(--color-surface);
      border-top: 1px solid var(--color-border);
    }

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

    /* Chat message footer (timestamp + copy) */
    .chat-message-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-xs);
    }

    /* Copy button */
    .copy-btn {
      font-size: 11px;
      padding: 2px 8px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background-color: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .copy-btn:hover {
      background-color: var(--color-surface);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .copy-btn.copied {
      background-color: var(--color-success);
      border-color: var(--color-success);
      color: white;
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

    /* Chat header */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-surface);
    }

    .chat-header-title {
      font-weight: 600;
      color: var(--color-text);
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
  `;

  document.head.appendChild(styleElement);
}

export {};