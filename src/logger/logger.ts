import type { LogEntry, Logger } from './types';

export class StructuredLogger implements Logger {
  private context?: string;
  private listeners: Array<(entry: LogEntry) => void> = [];

  constructor(context?: string) {
    this.context = context;
  }

  private emit(entry: LogEntry) {
    for (const l of this.listeners) {
      try {
        l(entry);
      } catch (_err) {
        // swallow listener errors
      }
    }
  }

  log(key: string, meta: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: 'log',
      key,
      meta,
      context: this.context
    };
    this.emit(entry);
    // default to console
    console.log(key, meta);
  }

  warn(key: string, meta: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: 'warn',
      key,
      meta,
      context: this.context
    };
    this.emit(entry);
    console.warn(key, meta);
  }

  error(key: string, meta: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: 'error',
      key,
      meta,
      context: this.context
    };
    this.emit(entry);
    console.error(key, meta);
  }

  debug(key: string, meta: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: 'debug',
      key,
      meta,
      context: this.context
    };
    this.emit(entry);
    console.debug(key, meta);
  }

  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: (entry: LogEntry) => void) {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }
}
