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
  `;

  document.head.appendChild(styleElement);
}

export {};