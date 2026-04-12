/**
 * Theme utilities for WebLM.
 *
 * Uses Tailwind CSS dark mode (class strategy):
 * - Light mode: no `dark` class on `<html>`
 * - Dark mode: `<html class="dark">`
 */

export type ThemeName = 'light' | 'dark' | 'system';

/**
 * Apply theme by toggling the `dark` class on `<html>`.
 */
export function applyThemeByName(themeName: ThemeName): void {
  const html = document.documentElement;
  if (themeName === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.toggle('dark', prefersDark);
  } else {
    html.classList.toggle('dark', themeName === 'dark');
  }
}

/**
 * Setup system theme change listener.
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => callback();
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
