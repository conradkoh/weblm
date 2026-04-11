/**
 * Base CSS styles - Reset, root variables, body styles.
 */

export const baseStyles = `
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
`;