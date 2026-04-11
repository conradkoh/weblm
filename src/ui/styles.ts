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
  `;

  document.head.appendChild(styleElement);
}

export {};