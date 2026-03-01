import type { Plugin } from "../plugin/registry";
import { AppLifecyclePhase } from "../core/lifecycle";
import { StructuredLogger } from "../logger/logger";

// simple service to recover state and reconnect services
export class StateRecoveryService {
  constructor(private app: any) {}
  recover(initialState: any) {
    if (this.app && typeof this.app.recoverState === 'function') {
      this.app.recoverState(initialState);
    }
  }
}

export class ServiceReconnectService {
  constructor(private app: any) {}
  async reconnect() {
    if (this.app && typeof this.app.reconnectServices === 'function') {
      await this.app.reconnectServices();
    }
  }
}

export const SpaCore: Plugin = {
  name: 'spa-core',
  version: '1.0.0',
  install(app) {
    // attach logger namespace for core
    if (!app.logger) {
      app.logger = new StructuredLogger('spa-core');
    }
  },
  hooks: {
    app: {
      [AppLifecyclePhase.HYDRATE]: [
        async (ctx) => {
          ctx.app?.logger?.log('sys.app.hydrate', { phase: 'start' });
          // attempt to recover state, if provided
          const initial = (typeof window !== 'undefined' && (window as any).__INITIAL_STATE__) || null;
          if (initial && ctx.app) {
            (new StateRecoveryService(ctx.app)).recover(initial);
          }
          try {
            await (new ServiceReconnectService(ctx.app)).reconnect();
          } catch (_e) {
            ctx.app?.logger?.warn('sys.service.error', { why: 'reconnect-failed' });
          }
          ctx.app?.logger?.log('sys.app.hydrate', { phase: 'complete' });
        }
      ]
    }
  },
  services: {
    'ux3.service.state': StateRecoveryService,
    'ux3.service.reconnect': ServiceReconnectService
  }
};
