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
export declare class Logger {
    private config;
    private requestContext;
    constructor(config: LoggerConfig);
    /**
     * Sets request context (session ID, user ID, etc.)
     */
    setContext(context: Record<string, unknown>): void;
    private log;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error, context?: Record<string, unknown>): void;
    fatal(message: string, error?: Error, context?: Record<string, unknown>): void;
}
/**
 * Global logger instance
 */
export declare const defaultLogger: Logger;
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
export declare class MetricsCollector {
    private metrics;
    private timers;
    /**
     * Records a metric value
     */
    record(name: string, value: number, unit?: string, tags?: Record<string, string>): void;
    /**
     * Starts a timer for measuring duration
     */
    startTimer(id: string): void;
    /**
     * Stops a timer and records the duration
     */
    stopTimer(id: string, name: string, tags?: Record<string, string>): number;
    /**
     * Measures function execution time
     */
    measure<T>(name: string, fn: () => Promise<T> | T, tags?: Record<string, string>): Promise<T>;
    /**
     * Gets recorded metrics
     */
    getMetrics(): Metric[];
    /**
     * Clears all metrics
     */
    clear(): void;
}
export declare const defaultMetrics: MetricsCollector;
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
export declare class ErrorBoundary {
    private reports;
    private reportEndpoint?;
    constructor(endpoint?: string);
    /**
     * Captures and reports an error
     */
    captureError(error: Error, context?: Record<string, unknown>): Promise<void>;
    /**
     * Gets all error reports
     */
    getReports(): ErrorReport[];
    /**
     * Clears error reports
     */
    clearReports(): void;
}
export declare const defaultErrorBoundary: ErrorBoundary | undefined;
