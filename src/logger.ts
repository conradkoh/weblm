/**
 * Structured logging utility for WebLM.
 *
 * Provides log levels and production silencing.
 * Prefixes all messages with [weblm].
 */

/** Log levels in order of severity */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/** Current log level - defaults based on environment */
function getDefaultLogLevel(): LogLevel {
  // Vite sets import.meta.env.DEV in development mode
  try {
    if (import.meta.env.DEV) {
      return LogLevel.DEBUG;
    }
  } catch {
    // import.meta.env might not be available in all contexts
  }
  return LogLevel.INFO;
}

/** Current log level */
let currentLevel = getDefaultLogLevel();

/**
 * Set the log level.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get the current log level.
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Format arguments for logging.
 */
function formatArgs(args: unknown[]): unknown[] {
  return args;
}

/**
 * Logger instance with prefixed methods.
 */
export const logger = {
  /**
   * Log debug messages (only in development).
   */
  debug(...args: unknown[]): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.log('[weblm]', ...formatArgs(args));
    }
  },

  /**
   * Log informational messages.
   */
  info(...args: unknown[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.log('[weblm]', ...formatArgs(args));
    }
  },

  /**
   * Log warning messages.
   */
  warn(...args: unknown[]): void {
    if (currentLevel <= LogLevel.WARN) {
      console.warn('[weblm]', ...formatArgs(args));
    }
  },

  /**
   * Log error messages.
   */
  error(...args: unknown[]): void {
    if (currentLevel <= LogLevel.ERROR) {
      console.error('[weblm]', ...formatArgs(args));
    }
  },
};

/**
 * Create a namespaced logger for different modules.
 * Useful for service workers or other modules with distinct prefixes.
 */
export function createLogger(namespace: string): typeof logger {
  const prefix = `[${namespace}]`;
  return {
    debug(...args: unknown[]): void {
      if (currentLevel <= LogLevel.DEBUG) {
        console.log(prefix, ...formatArgs(args));
      }
    },
    info(...args: unknown[]): void {
      if (currentLevel <= LogLevel.INFO) {
        console.log(prefix, ...formatArgs(args));
      }
    },
    warn(...args: unknown[]): void {
      if (currentLevel <= LogLevel.WARN) {
        console.warn(prefix, ...formatArgs(args));
      }
    },
    error(...args: unknown[]): void {
      if (currentLevel <= LogLevel.ERROR) {
        console.error(prefix, ...formatArgs(args));
      }
    },
  };
}

// Export default logger
export default logger;