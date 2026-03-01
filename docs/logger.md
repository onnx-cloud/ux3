# Structured Logging

UX3 uses a structured, key-based logging system to keep framework and
application telemetry consistent and machine-readable. Messages are identified
by i18n-style keys; there is **no human-readable text** in code. This makes it
easier to integrate with analytics, monitoring, and translation pipelines.

## Logger Interface

```ts
interface LogEntry {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'debug';
  key: string;          // e.g. 'sys.app.init'
  meta?: Record<string, any>;
  context?: string;     // optional context identifier (FSM, component, etc.)
}

interface Logger {
  log(key: string, meta?: any): void;
  warn(key: string, meta?: any): void;
  error(key: string, meta?: any): void;
  debug(key: string, meta?: any): void;
  subscribe(listener: (entry: LogEntry) => void): void;
  unsubscribe?(listener: (entry: LogEntry) => void): void;
}
```

`StructuredLogger` is the default implementation; it writes to `console` and
emits entries to subscribed listeners (plugins may provide their own transport).

## Message Key Namespaces

| Namespace | Purpose | Example keys |
|-----------|---------|--------------|
| `sys.*.*` | Framework/system events | `sys.app.init`, `sys.plugin.error` |
| `app.*.*` | Application/domain events  | `app.auth.login`, `app.form.submit` |

Plugin authors should define their own domain namespace (e.g. `analytics.*`)
and avoid colliding with system keys.

## Subscription

Plugins can listen to all log entries:

```ts
const logger = new StructuredLogger();
logger.subscribe((entry) => {
  // forward to remote monitoring service
});
```

Entries include a timestamp, severity level, and optional `meta` payload for
structured data (e.g. `{ userId: 123, errorCode: 'E_TIMEOUT' }`).

## Extending the Logger

You may implement custom loggers by conforming to the `Logger` interface and
registering it via a plugin:

```ts
export const MyLoggerPlugin: Plugin = {
  name: 'my-logger',
  install(app) {
    app.logger = new MyCustomLogger();
  }
};
```

For most use cases, the built-in `StructuredLogger` suffices.

## Predefined System Keys

Refer to `src/logger/keys.ts` for the full list of predefined `SYS.*` constants
defined by the framework.
