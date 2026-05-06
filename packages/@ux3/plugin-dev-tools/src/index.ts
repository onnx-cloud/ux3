import type { Plugin } from '../../../../src/plugin/registry.js';
import type { AppContext } from '../../../../src/ui/app.js';
import { createRequire } from 'module';
import { createDevToolsService } from './services/dev-tools.service.js';
import type { DevToolsApi, DevToolsPluginConfig } from './types.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

declare global {
  interface Window {
    __ux3DevTools?: DevToolsApi;
  }
}

function readConfig(app: AppContext): DevToolsPluginConfig {
  const pluginConfig = (app.config?.plugins && app.config.plugins['@ux3/plugin-dev-tools']) || {};
  return {
    ...(DevToolsPlugin as any).config,
    ...(pluginConfig as DevToolsPluginConfig),
  };
}

export const DevToolsPlugin: Plugin = {
  name: '@ux3/plugin-dev-tools',
  version,
  description: 'UX3 development tools plugin (inspector, diagnostics, and event stream)',

  async install(app) {
    const cfg = readConfig(app);
    const service = createDevToolsService({ maxEvents: cfg.maxEvents });

    app.utils = app.utils || {};
    (app.utils as any).devTools = service;

    app.registerService?.('devTools', () => service as any);

    if (typeof window !== 'undefined') {
      window.__ux3DevTools = service;
    }

    service.emit('system', 'dev-tools.installed', {
      inspector: !!app.config?.development?.inspector,
      devTools: !!app.config?.development?.devTools,
    });
  },
};

export default DevToolsPlugin;

export type {
  DevToolsApi,
  DevToolsEvent,
  DevToolsPluginConfig,
  DevToolsSnapshot,
  DevToolsSource,
} from './types.js';
