import type { Plugin } from '../../../src/plugin/registry';

export interface SentryConfig {
  /** Sentry DSN string */
  dsn?: string;
  /** Environment tag (default: 'production') */
  environment?: string;
  /** Release tag */
  release?: string;
}

/**
 * Sentry plugin — integrates with the Sentry JS SDK when available.
 *
 * If the Sentry SDK is not installed the plugin degrades gracefully to
 * console.error capturing so error information is never silently dropped.
 */
export const SentryPlugin: Plugin = {
  name: '@ux3/plugin-sentry',
  version: '1.0.0',
  description: 'Error monitoring via Sentry (or console fallback when SDK unavailable).',
  async install(app) {
    const cfg: SentryConfig = (app.config as any)?.plugins?.['@ux3/plugin-sentry'] ??
      (app.config as any)?.plugins?.sentry ?? {};

    let sentry: any = null;

    // attempt to load the Sentry SDK
    try {
      sentry = await import('@sentry/browser' as any);
      if (cfg.dsn) {
        sentry.init({
          dsn: cfg.dsn,
          environment: cfg.environment ?? 'production',
          release: cfg.release,
        });
      }
    } catch {
      // SDK not installed — fall back to structured logger / console
    }

    const capture = (err: Error | unknown) => {
      if (sentry && cfg.dsn) {
        sentry.captureException(err);
      } else {
        app.logger?.error?.('sentry.capture', { error: String(err) });
        console.error('[sentry] capture', err);
      }
    };

    // global unhandled error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (evt) => capture(evt.error));
      window.addEventListener('unhandledrejection', (evt) => capture(evt.reason));
    }

    // expose capture util for programmatic use
    (app as any).utils = (app as any).utils || {};
    (app as any).utils.captureException = capture;
  }
};

export default SentryPlugin;
