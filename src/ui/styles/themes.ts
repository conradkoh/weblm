/**
 * Theme types and functions for WebLM.
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