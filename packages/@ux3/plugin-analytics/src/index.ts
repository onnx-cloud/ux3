import type { Plugin } from '@ux3/plugin/registry';
import type { AppContext } from '@ux3/ui/app';

export interface AnalyticsConfig {
  /** URL to POST log entries to */
  endpoint?: string;
  /** Max entries to batch before flushing (default: 20) */
  batchSize?: number;
  /** Flush interval in ms (default: 5000) */
  flushInterval?: number;
}

const DEFAULT_BATCH = 20;
const DEFAULT_INTERVAL = 5_000;

export const AnalyticsPlugin: Plugin = {
  name: '@ux3/plugin-analytics',
  version: '1.0.0',
  description: 'Forwards structured log entries to a configurable analytics endpoint with batching.',
  install(app: AppContext) {
    const cfg: AnalyticsConfig = (app.config as any)?.plugins?.['@ux3/plugin-analytics'] ??
      (app.config as any)?.plugins?.analytics ?? {};

    const endpoint = cfg.endpoint;
    if (!endpoint) {
      // no endpoint configured — analytics is a no-op
      return;
    }

    const batchSize = cfg.batchSize ?? DEFAULT_BATCH;
    const flushInterval = cfg.flushInterval ?? DEFAULT_INTERVAL;

    const queue: any[] = [];

    const flush = () => {
      if (queue.length === 0) return;
      const payload = queue.splice(0, batchSize);
      // use sendBeacon when available (guaranteed delivery on page unload)
      const body = JSON.stringify({ events: payload });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, body);
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => { /* silently discard on failure */ });
      }
    };

    // subscribe to structured log entries
    app.logger?.subscribe((entry) => {
      queue.push({ ...entry, ts: Date.now() });
      if (queue.length >= batchSize) flush();
    });

    // periodic flush
    const timer = typeof setInterval !== 'undefined'
      ? setInterval(flush, flushInterval)
      : null;

    // flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
      });
      window.addEventListener('pagehide', flush);
    }

    // expose manual flush util
    (app as any).utils = (app as any).utils || {};
    (app as any).utils.analyticsFlush = flush;

    // cleanup helper for tests
    (app as any)._analyticsCleanup = () => {
      if (timer) clearInterval(timer);
    };
  }
};

export default AnalyticsPlugin;
