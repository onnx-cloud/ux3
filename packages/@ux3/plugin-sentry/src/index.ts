import type { Plugin } from '../../../src/plugin/registry';

export const SentryPlugin: Plugin = {
  name: '@ux3/plugin-sentry',
  version: '1.0.0',
  install(app) {
    // attach global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (evt) => {
        console.error('[sentry] capture', evt.error);
      });
    }
  }
};

export default SentryPlugin;