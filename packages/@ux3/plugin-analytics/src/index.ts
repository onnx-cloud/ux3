import type { Plugin } from '@ux3/plugin/registry';
import type { AppContext } from '@ux3/ui/app';

export type AnalyticsMode = 'batch' | 'realtime';
export type QueueDropPolicy = 'oldest' | 'newest';

export interface AnalyticsEvent {
  id?: string;
  name: string;
  timestamp?: number;
  level?: 'log' | 'warn' | 'error' | 'debug' | 'info';
  source?: 'logger' | 'global' | 'app' | string;
  payload?: Record<string, unknown> | unknown;
  context?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface AnalyticsProvider {
  name: string;
  track(event: AnalyticsEvent): void | Promise<void>;
  trackBatch?(events: AnalyticsEvent[]): void | Promise<void>;
  flush?(): void | Promise<void>;
  shutdown?(): void | Promise<void>;
}

export interface AnalyticsConfig {
  /** URL to POST log entries to */
  endpoint?: string;
  /** Max entries to batch before flushing (default: 20) */
  batchSize?: number;
  /** Flush interval in ms (default: 5000) */
  flushInterval?: number;

  /** Disable plugin behavior without removing config */
  enabled?: boolean;
  /** Default is batch mode to avoid event storms */
  mode?: AnalyticsMode;
  /** Max queued events before dropping based on dropPolicy */
  maxQueueSize?: number;
  /** Drop oldest by default to keep latest user activity */
  dropPolicy?: QueueDropPolicy;

  /** Custom telemetry providers (Google, Zoho, BI pipelines, etc.) */
  providers?: AnalyticsProvider[];

  /** Capture logger events into telemetry stream (default: true) */
  captureLogs?: boolean;
  /** Capture global window.__ux3Telemetry events (default: true) */
  captureGlobalTelemetry?: boolean;
  /** Forward captured global telemetry to previous hook (default: true) */
  forwardGlobalTelemetry?: boolean;

  /** Filter/transform hooks before dispatch */
  filter?: (event: AnalyticsEvent) => boolean;
  transform?: (event: AnalyticsEvent) => AnalyticsEvent | AnalyticsEvent[] | null | undefined;
  /** Context merged into every event */
  baseContext?: Record<string, unknown>;
}

const DEFAULT_BATCH = 20;
const DEFAULT_INTERVAL = 5_000;
const DEFAULT_MAX_QUEUE_SIZE = 1_000;

function noop(): void {}

function toArray<T>(input: T | T[] | null | undefined): T[] {
  if (input == null) return [];
  return Array.isArray(input) ? input : [input];
}

function mapLevel(level: unknown): AnalyticsEvent['level'] {
  if (level === 'log') return 'log';
  if (level === 'warn') return 'warn';
  if (level === 'error') return 'error';
  if (level === 'debug') return 'debug';
  if (level === 'info') return 'info';
  return 'info';
}

async function dispatchToProvider(provider: AnalyticsProvider, events: AnalyticsEvent[]): Promise<void> {
  if (events.length === 0) return;
  if (provider.trackBatch) {
    await provider.trackBatch(events);
    return;
  }
  for (const event of events) {
    await provider.track(event);
  }
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Provider: sends events to an HTTP endpoint.
 */
export function createHttpAnalyticsProvider(endpoint: string): AnalyticsProvider {
  const sendBody = (body: string): void => {
    if (!endpoint) return;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(endpoint, body);
      return;
    }
    if (typeof fetch === 'function') {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(noop);
    }
  };

  return {
    name: 'http',
    track(event) {
      sendBody(JSON.stringify({ events: [event] }));
    },
    trackBatch(events) {
      sendBody(JSON.stringify({ events }));
    },
  };
}

/**
 * Provider: emits events to Google gtag if present.
 */
export function createGoogleAnalyticsProvider(): AnalyticsProvider {
  return {
    name: 'google-analytics',
    track(event) {
      const gtag = (typeof window !== 'undefined' ? (window as any).gtag : undefined);
      if (typeof gtag !== 'function') return;
      const payload = typeof event.payload === 'object' && event.payload !== null
        ? event.payload as Record<string, unknown>
        : { value: event.payload };
      gtag('event', event.name, {
        ...payload,
        ux3_source: event.source,
        ux3_level: event.level,
      });
    },
  };
}

/**
 * Provider: pushes events into dataLayer (for GTM and similar tools).
 */
export function createDataLayerProvider(): AnalyticsProvider {
  return {
    name: 'data-layer',
    track(event) {
      if (typeof window === 'undefined') return;
      const dataLayer = ((window as any).dataLayer = (window as any).dataLayer || []);
      dataLayer.push({
        event: event.name,
        timestamp: event.timestamp,
        source: event.source,
        level: event.level,
        payload: event.payload,
        context: event.context,
        tags: event.tags,
      });
    },
  };
}

export const AnalyticsPlugin: Plugin = {
  name: '@ux3/plugin-analytics',
  version: '1.0.0',
  description: 'Lightweight telemetry and analytics with pluggable providers, batching, and realtime mode.',
  install(app: AppContext) {
    const cfg: AnalyticsConfig = (app.config as any)?.plugins?.['@ux3/plugin-analytics'] ??
      (app.config as any)?.plugins?.analytics ?? {};

    if (cfg.enabled === false) {
      return;
    }

    const mode: AnalyticsMode = cfg.mode ?? 'batch';
    const batchSize = Math.max(1, cfg.batchSize ?? DEFAULT_BATCH);
    const flushInterval = Math.max(100, cfg.flushInterval ?? DEFAULT_INTERVAL);
    const maxQueueSize = Math.max(1, cfg.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE);
    const dropPolicy: QueueDropPolicy = cfg.dropPolicy ?? 'oldest';

    const providers: AnalyticsProvider[] = [
      ...(cfg.providers ?? []),
    ];

    if (cfg.endpoint) {
      providers.push(createHttpAnalyticsProvider(cfg.endpoint));
    }

    if (providers.length === 0) {
      return;
    }

    const queue: AnalyticsEvent[] = [];
    const baseContext = { ...(cfg.baseContext ?? {}) };

    const pushToQueue = (event: AnalyticsEvent): void => {
      if (queue.length >= maxQueueSize) {
        if (dropPolicy === 'newest') {
          return;
        }
        queue.shift();
      }
      queue.push(event);
    };

    const sendToProviders = (events: AnalyticsEvent[]): void => {
      const tasks = providers.map((provider) => dispatchToProvider(provider, events));
      void Promise.all(tasks).catch(noop);
    };

    const flush = (): void => {
      if (queue.length === 0) return;
      while (queue.length > 0) {
        sendToProviders(queue.splice(0, batchSize));
      }
    };

    const applyHooks = (event: AnalyticsEvent): AnalyticsEvent[] => {
      const withContext: AnalyticsEvent = {
        ...event,
        id: event.id ?? randomId(),
        timestamp: event.timestamp ?? Date.now(),
        context: {
          ...baseContext,
          ...(event.context ?? {}),
        },
      };

      if (cfg.filter && !cfg.filter(withContext)) {
        return [];
      }

      if (!cfg.transform) {
        return [withContext];
      }

      const transformed = toArray(cfg.transform(withContext));
      return transformed.map((entry) => ({
        ...entry,
        id: entry.id ?? randomId(),
        timestamp: entry.timestamp ?? Date.now(),
      }));
    };

    const track = (event: AnalyticsEvent): void => {
      const events = applyHooks(event);
      if (events.length === 0) return;
      if (mode === 'realtime') {
        sendToProviders(events);
        return;
      }
      for (const entry of events) {
        pushToQueue(entry);
      }
      if (queue.length >= batchSize) {
        flush();
      }
    };

    let loggerListener: ((entry: any) => void) | null = null;
    if (cfg.captureLogs !== false && app.logger?.subscribe) {
      loggerListener = (entry: any) => {
        track({
          name: String(entry?.key ?? 'log.event'),
          level: mapLevel(entry?.level),
          source: 'logger',
          payload: entry?.meta ?? {},
          context: entry?.context ? { loggerContext: entry.context } : undefined,
          timestamp: typeof entry?.timestamp === 'number' ? entry.timestamp : Date.now(),
        });
      };
      app.logger.subscribe(loggerListener);
    }

    const timer = typeof setInterval !== 'undefined'
      ? setInterval(() => flush(), flushInterval)
      : null;

    const previousTelemetry =
      typeof window !== 'undefined' ? (window as any).__ux3Telemetry : undefined;

    const globalTelemetryListener = (eventType: string, data: unknown): void => {
      track({
        name: String(eventType || 'ux3.event'),
        source: 'global',
        payload: data as any,
      });

      if (
        cfg.forwardGlobalTelemetry !== false &&
        typeof previousTelemetry === 'function' &&
        previousTelemetry !== globalTelemetryListener
      ) {
        previousTelemetry(eventType, data);
      }
    };

    if (typeof window !== 'undefined') {
      if (cfg.captureGlobalTelemetry !== false) {
        (window as any).__ux3Telemetry = globalTelemetryListener;
      }
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
      });
      window.addEventListener('pagehide', flush);
      window.addEventListener('beforeunload', flush);
    }

    (app as any).utils = (app as any).utils || {};
    (app as any).utils.analyticsFlush = flush;
    (app as any).utils.analyticsTrack = (name: string, payload?: unknown, meta: Partial<AnalyticsEvent> = {}) => {
      track({
        ...meta,
        name,
        source: meta.source ?? 'app',
        payload,
      });
    };
    (app as any).utils.analyticsSetContext = (context: Record<string, unknown>) => {
      Object.assign(baseContext, context);
    };

    (app as any)._analyticsCleanup = () => {
      flush();
      if (timer) {
        clearInterval(timer);
      }
      if (loggerListener && app.logger?.unsubscribe) {
        app.logger.unsubscribe(loggerListener);
      }
      for (const provider of providers) {
        try {
          void provider.flush?.();
          void provider.shutdown?.();
        } catch {
          // no-op
        }
      }
      if (
        typeof window !== 'undefined' &&
        cfg.captureGlobalTelemetry !== false &&
        (window as any).__ux3Telemetry === globalTelemetryListener
      ) {
        (window as any).__ux3Telemetry = previousTelemetry;
      }
    };
  }
};

export default AnalyticsPlugin;
