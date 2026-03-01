import type { Plugin } from '../../src/plugin/registry';
import { AppLifecyclePhase } from '../../src/core/lifecycle';

export default {
  name: 'iam-analytics',
  version: '1.0.0',
  hooks: {
    app: {
      [AppLifecyclePhase.READY]: [
        (ctx) => {
          ctx.app?.logger.subscribe((entry) => {
            // placeholder: forward log entries to analytics endpoint
            // console.log('[analytics]', entry);
          });
        }
      ]
    }
  }
} as Plugin;