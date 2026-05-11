import type { Plugin } from '../../../../src/plugin/registry';
import type { ObservableEvent } from '../../../../src/observability/event-bus';

export interface TelemetryConfig {
  /** OpenTelemetry collector endpoint */
  endpoint?: string;
  /** Local file path for log output (server-side only) */
  logFile?: string;
  /** Minimum event level to record (default: 'info') */
  minLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Environment tag */
  environment?: string;
  /** Release tag */
  release?: string;
  /** Excluded sources (e.g. ['logger', 'view']) */
  excludeSources?: string[];
}

declare global {
  interface Window {
    __ux3Observable?: {
      subscribe: (sub: (event: ObservableEvent) => void) => () => void;
      getBuffer: () => ObservableEvent[];
    };
  }
}

export const telemetryPlugin: Plugin = {
  name: '@ux3/plugin-telemetry',
  version: '0.1.0',
  description: 'Telemetry via OpenTelemetry, file logging, or console — subscribes to UX3 observable event bus.',
  async install(app) {
    const cfg: TelemetryConfig = (app.config as any)?.plugins?.['@ux3/plugin-telemetry'] ??
      (app.config as any)?.plugins?.telemetry ?? {};

    const minLevel = cfg.minLevel ?? 'info';
    const levelRank: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

    let otelExporter: ((event: ObservableEvent) => void) | null = null;
    let fileLogger: ((event: ObservableEvent) => void) | null = null;

    // Attempt to load OpenTelemetry SDK
    if (cfg.endpoint) {
      try {
        const otel = await import('@opentelemetry/sdk-trace-web' as any);
        if (otel) {
          otelExporter = (event: ObservableEvent) => {
            try {
              fetch(cfg.endpoint!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  timestamp: new Date(event.timestamp).toISOString(),
                  source: event.source,
                  type: event.type,
                  payload: event.payload,
                  environment: cfg.environment ?? 'production',
                  release: cfg.release,
                }),
              }).catch(() => {
                // silently drop if collector unreachable
              });
            } catch {
              // network error — skip
            }
          };
        }
      } catch {
        // OpenTelemetry SDK not available — fall through
      }
    }

    // Server-side file logging (Node.js only)
    if (typeof window === 'undefined' && cfg.logFile) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const dir = path.dirname(cfg.logFile);
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        const stream = fs.createWriteStream(cfg.logFile, { flags: 'a' });
        fileLogger = (event: ObservableEvent) => {
          const line = JSON.stringify({
            timestamp: new Date(event.timestamp).toISOString(),
            source: event.source,
            type: event.type,
            payload: event.payload,
          }) + '\n';
          stream.write(line);
        };
      } catch {
        // fs not available — skip file logging
      }
    }

    // Subscribe to the observable event bus
    const observable = typeof window !== 'undefined'
      ? window.__ux3Observable
      : (globalThis as any).__ux3Observable;

    if (observable && typeof observable.subscribe === 'function') {
      observable.subscribe((event: ObservableEvent) => {
        // Filter by level
        const eventLevel = event.type.endsWith('.error') || event.type.endsWith('.failed') ? 'error'
          : event.type.endsWith('.warn') ? 'warn'
          : event.type.includes('.debug') ? 'debug'
          : 'info';

        if (levelRank[eventLevel] < levelRank[minLevel]) return;

        // Filter by source
        if (cfg.excludeSources?.includes(event.source)) return;

        // Route to OpenTelemetry
        if (otelExporter) otelExporter(event);

        // Route to file
        if (fileLogger) fileLogger(event);
      });
    }

    // Global unhandled error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (evt) => {
        const err = evt.error;
        app.logger?.error?.('telemetry.unhandled.error', {
          message: err?.message ?? String(err),
          stack: err?.stack,
          filename: evt.filename,
          lineno: evt.lineno,
        });
      });
      window.addEventListener('unhandledrejection', (evt) => {
        app.logger?.error?.('telemetry.unhandled.rejection', {
          reason: evt.reason instanceof Error ? evt.reason.message : String(evt.reason),
        });
      });
    }
  },
};

export default telemetryPlugin;
