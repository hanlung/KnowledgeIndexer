export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] ${level.toUpperCase()} ${message}`;
  if (context && Object.keys(context).length > 0) {
    return `${base} ${JSON.stringify(context)}`;
  }
  return base;
}

// All logger output goes to stderr so it can never collide with stdout-bound
// channels (MCP stdio protocol, programmatic callers piping ki output, etc.).
function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (shouldLog(level)) {
    process.stderr.write(`${formatMessage(level, message, context)}\n`);
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    emit('debug', message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    emit('info', message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    emit('warn', message, context);
  },

  error(message: string, context?: Record<string, unknown>): void {
    emit('error', message, context);
  },
};
