import { logger } from '../utils/logger.js';

/**
 * Wraps a commander action with uniform error handling: surfaces a single-line
 * error to stderr, logs structured context, and exits with code 1.
 */
export function runAction<Args extends readonly unknown[]>(
  action: (...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      await action(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Command failed', { error: message });
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  };
}
