export interface LogEntry {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'debug';
  key: string;
  meta?: Record<string, any>;
  context?: string;
}

export interface Logger {
  log(key: string, meta?: any): void;
  warn(key: string, meta?: any): void;
  error(key: string, meta?: any): void;
  debug(key: string, meta?: any): void;
  subscribe(listener: (entry: LogEntry) => void): void;
  unsubscribe?(listener: (entry: LogEntry) => void): void;
}