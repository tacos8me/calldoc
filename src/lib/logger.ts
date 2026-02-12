// ─── Structured Logging Infrastructure ───────────────────────────────────────
// Lightweight structured logger for production and development.
// No external dependencies -- uses console with JSON formatting in production
// and pretty-printed colored output in development.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  [key: string]: unknown;
}

interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
}

// ---------------------------------------------------------------------------
// Log Level Priority
// ---------------------------------------------------------------------------

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ---------------------------------------------------------------------------
// ANSI Color Codes (for development pretty-printing)
// ---------------------------------------------------------------------------

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  // Level colors
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  // Context colors
  context: '\x1b[35m', // Magenta
  timestamp: '\x1b[90m', // Gray
} as const;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const minLevel: LogLevel = isTest
  ? 'error'
  : isProduction
    ? (process.env.LOG_LEVEL as LogLevel) || 'info'
    : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatError(error: unknown): { message: string; stack?: string; name: string } | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return {
    message: String(error),
    name: 'UnknownError',
  };
}

function formatProduction(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function formatDevelopment(entry: LogEntry): string {
  const { timestamp, level, message, context, error: errorInfo, ...rest } = entry;

  const ts = `${COLORS.timestamp}${timestamp}${COLORS.reset}`;
  const lvl = `${COLORS[level]}${COLORS.bold}${level.toUpperCase().padEnd(5)}${COLORS.reset}`;
  const ctx = context ? ` ${COLORS.context}[${context}]${COLORS.reset}` : '';
  const msg = `${COLORS[level]}${message}${COLORS.reset}`;

  let line = `${ts} ${lvl}${ctx} ${msg}`;

  // Add metadata if present
  const metaKeys = Object.keys(rest);
  if (metaKeys.length > 0) {
    const metaStr = metaKeys
      .map((k) => `${COLORS.dim}${k}=${COLORS.reset}${JSON.stringify(rest[k])}`)
      .join(' ');
    line += ` ${metaStr}`;
  }

  // Add error details
  if (errorInfo) {
    line += `\n  ${COLORS.error}${errorInfo.name}: ${errorInfo.message}${COLORS.reset}`;
    if (errorInfo.stack) {
      const stackLines = errorInfo.stack.split('\n').slice(1, 4);
      line += `\n${COLORS.dim}${stackLines.join('\n')}${COLORS.reset}`;
    }
  }

  return line;
}

// ---------------------------------------------------------------------------
// Logger Implementation
// ---------------------------------------------------------------------------

function createLoggerImpl(contextData: Record<string, unknown> = {}): Logger {
  const contextName = (contextData.service || contextData.context) as string | undefined;

  function log(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: unknown): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      message,
      ...contextData,
      ...(meta || {}),
    };

    if (contextName) {
      entry.context = contextName;
    }

    const errorInfo = formatError(error);
    if (errorInfo) {
      entry.error = errorInfo;
    }

    const formatted = isProduction ? formatProduction(entry) : formatDevelopment(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  return {
    debug(message: string, meta?: Record<string, unknown>) {
      log('debug', message, meta);
    },
    info(message: string, meta?: Record<string, unknown>) {
      log('info', message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>) {
      log('warn', message, meta);
    },
    error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
      log('error', message, meta, error);
    },
    child(childContext: Record<string, unknown>): Logger {
      return createLoggerImpl({ ...contextData, ...childContext });
    },
  };
}

// ---------------------------------------------------------------------------
// Request Logging Middleware
// ---------------------------------------------------------------------------

/**
 * Log an API request. Call at the start and end of route handlers.
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const end = logRequest(request);
 *   try {
 *     // ... handle request
 *     return end(200);
 *   } catch (error) {
 *     return end(500);
 *   }
 * }
 * ```
 */
export function logRequest(request: Request): (status: number) => void {
  const start = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  return (status: number) => {
    const duration = Date.now() - start;
    logger.info(`${method} ${path} ${status}`, {
      method,
      path,
      status,
      durationMs: duration,
    });
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Default singleton logger for the application.
 *
 * ```ts
 * import { logger } from '@/lib/logger';
 * logger.info('Server started', { port: 3000 });
 * ```
 */
export const logger: Logger = createLoggerImpl();

/**
 * Create a child logger with a service context.
 *
 * ```ts
 * import { createLogger } from '@/lib/logger';
 * const log = createLogger({ service: 'devlink3' });
 * log.info('Connected to IP Office');
 * ```
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return createLoggerImpl(context);
}

export type { Logger, LogLevel, LogEntry };
