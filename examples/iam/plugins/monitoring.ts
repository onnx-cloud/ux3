import type { Plugin } from '../../src/plugin/registry';
import { AppLifecyclePhase, ServiceLifecyclePhase } from '../../src/core/lifecycle';

export default {
  name: 'iam-monitoring',
  version: '1.0.0',
  hooks: {
    app: {
      [AppLifecyclePhase.INIT]: [
        (ctx) => ctx.app?.logger.log('app.monitoring.init')
      ]
    },
    service: {
      [ServiceLifecyclePhase.ERROR]: [
        (ctx) => {
          ctx.app?.logger.error('app.service.error', {
            service: ctx.service?.name,
            meta: ctx.meta
          });
        }
      ]
    }
  }
} as Plugin;