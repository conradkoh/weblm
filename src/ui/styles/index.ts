/**
 * Styles barrel file - Re-exports all style modules and provides injectGlobalStyles.
 */

// Re-export theme types and functions
export {
  type Theme,
  lightTheme,
  darkTheme,
  applyTheme,
  applyThemeByName,
  watchSystemTheme,
  createStyles,
} from './themes';

// Import CSS modules for global injection
import { baseStyles } from './base';
import { chatStyles } from './chat';
import { inputStyles } from './input';
import { settingsStyles } from './settings';
import { componentStyles } from './components';

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
  styleElement.textContent = [
    baseStyles,
    componentStyles,
    chatStyles,
    inputStyles,
    settingsStyles,
  ].join('\n');

  document.head.appendChild(styleElement);
}

// Export empty object for module consistency
export {};