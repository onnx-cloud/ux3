/**
 * Structured logging and observability
 * Provides error tracking, metrics, and telemetry
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  handlers: LogHandler[];
  contextProvider?: () => Record<string, unknown>;
}

export interface LogHandler {
  handle(entry: LogEntry): void | Promise<void>;
}

class ConsoleLogHandler implements LogHandler {
  handle(entry: LogEntry): void {
    const styleMap = {
      debug: 'color: blue',
      info: 'color: grey',
      warn: 'color: orange',
      error: 'color: red',
      fatal: 'color: darkred; font-weight: bold'
    };

    const args: unknown[] = [`%c ${entry.message}`, styleMap[entry.level]];
    if (entry.context && Object.keys(entry.context).length > 0) {
      args.push(entry.context);
    }
    if (entry.error) {
      args.push(entry.error);
    }
    console.log(...args);
  }
}

const logLevelMap = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };

export class Logger {
  private config: LoggerConfig;
  private requestContext: Record<string, unknown> = {};

  constructor(config: LoggerConfig) {
    const defaults: LoggerConfig = {
      minLevel: 'info',
      handlers: [new ConsoleLogHandler()]
    };
    this.config = { ...defaults, ...config };
  }

  /**
   * Sets request context (session ID, user ID, etc.)
   */
  setContext(context: Record<string, unknown>): void {
    this.requestContext = context;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (logLevelMap[level] < logLevelMap[this.config.minLevel]) {
      return;
    }

    const mergedContext = { ...this.requestContext, ...context };
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: Object.keys(mergedContext).length > 0 ? mergedContext : undefined,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };

    this.config.handlers.forEach(handler => handler.handle(entry));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('fatal', message, context, error);
  }
}

/**
 * Global logger instance
 */
export const defaultLogger = new Logger({
  minLevel: 'info',
  handlers: [new ConsoleLogHandler()]
});

/**
 * Performance metrics and error tracking
 */
export interface Metric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp: string;
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  private timers = new Map<string, number>();

  /**
   * Records a metric value
   */
  record(name: string, value: number, unit: string = '', tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      unit,
      tags,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Starts a timer for measuring duration
   */
  startTimer(id: string): void {
    this.timers.set(id, performance.now());
  }

  /**
   * Stops a timer and records the duration
   */
  stopTimer(id: string, name: string, tags?: Record<string, string>): number {
    const start = this.timers.get(id);
    if (!start) {
      defaultLogger.warn(`Timer ${id} not found`);
      return 0;
    }

    const duration = performance.now() - start;
    this.record(name, duration, 'ms', tags);
    this.timers.delete(id);
    return duration;
  }

  /**
   * Measures function execution time
   */
  async measure<T>(name: string, fn: () => Promise<T> | T, tags?: Record<string, string>): Promise<T> {
    const id = `measure_${Math.random()}`;
    this.startTimer(id);
    
    try {
      return await fn();
    } finally {
      this.stopTimer(id, name, tags);
    }
  }

  /**
   * Gets recorded metrics
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clears all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }
}

export const defaultMetrics = new MetricsCollector();

/**
 * Error boundary for catching and reporting errors
 */
export interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  userAgent: string;
  url: string;
}

export class ErrorBoundary {
  private reports: ErrorReport[] = [];
  private reportEndpoint?: string;

  constructor(endpoint?: string) {
    this.reportEndpoint = endpoint;

    if (typeof window !== 'undefined') {
      // Catch unhandled errors
      window.addEventListener('error', (event) => {
        this.captureError(event.error, { type: 'uncaught' });
      });

      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(new Error(String(event.reason)), { type: 'unhandledRejection' });
      });
    }
  }

  /**
   * Captures and reports an error
   */
  async captureError(error: Error, context: Record<string, unknown> = {}): Promise<void> {
    const report: ErrorReport = {
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.reports.push(report);
    defaultLogger.error('Error captured', error, context);

    if (this.reportEndpoint) {
      try {
        await fetch(this.reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
      } catch (err) {
        defaultLogger.error('Failed to report error', err as Error);
      }
    }
  }

  /**
   * Gets all error reports
   */
  getReports(): ErrorReport[] {
    return [...this.reports];
  }

  /**
   * Clears error reports
   */
  clearReports(): void {
    this.reports = [];
  }
}

export const defaultErrorBoundary = typeof window !== 'undefined' ? new ErrorBoundary() : undefined;
