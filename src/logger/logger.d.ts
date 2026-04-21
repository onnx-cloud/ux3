import type { LogEntry, Logger } from './types';
export declare class StructuredLogger implements Logger {
    private context?;
    private listeners;
    constructor(context?: string);
    private emit;
    log(key: string, meta?: Record<string, unknown>): void;
    warn(key: string, meta?: Record<string, unknown>): void;
    error(key: string, meta?: Record<string, unknown>): void;
    debug(key: string, meta?: Record<string, unknown>): void;
    subscribe(listener: (entry: LogEntry) => void): void;
    unsubscribe(listener: (entry: LogEntry) => void): void;
}
