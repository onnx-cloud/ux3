/**
 * Built-in dev-tools plugin.
 *
 * Provides the inspector UI (bottom-right dock with system, events, FSM tabs)
 * and the devTools telemetry service. Installed automatically when the
 * @ux3/plugin-dev-tools entry appears in config.plugins or
 * config.development.inspector / devTools is set.
 */
import type { Plugin } from '../../plugin/registry.js';
import { createDevToolsService } from '../../../packages/@ux3/plugin-dev-tools/src/services/dev-tools.service.js';
import { createInspectorShell } from '../../../packages/@ux3/plugin-dev-tools/src/inspector/inspector-shell.js';

function extractDevToolsPluginConfig(entry: any): Record<string, unknown> | null {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return entry === '@ux3/plugin-dev-tools' ? {} : null;
  }
  if (typeof entry === 'object' && entry.name === '@ux3/plugin-dev-tools') {
    return (entry.config as Record<string, unknown>) || {};
  }
  return null;
}

export function resolveDevToolsFlags(config: any): { inspector: boolean; devTools: boolean } {
  const pluginEntries = Array.isArray(config?.plugins) ? config.plugins : [];
  let pluginEnabled = false, pluginInspector = false, pluginDevTools = false;

  for (const entry of pluginEntries) {
    const pluginCfg = extractDevToolsPluginConfig(entry);
    if (!pluginCfg) continue;
    if (pluginCfg.enabled === true) pluginEnabled = true;
    if (pluginCfg.inspector === true) pluginInspector = true;
    if (pluginCfg.devTools === true) pluginDevTools = true;
  }

  return {
    inspector: !!(config?.development?.inspector || pluginEnabled || pluginInspector),
    devTools: !!(config?.development?.devTools || config?.development?.inspector || pluginEnabled || pluginDevTools),
  };
}

export const builtInDevToolsPlugin: Plugin = {
  name: '@ux3/plugin-dev-tools',
  version: 'workspace',
  description: 'UX3 development tools plugin (inspector, diagnostics, and event stream)',
  async install(app) {
    const service = createDevToolsService();
    const flags = resolveDevToolsFlags(app.config);

    app.utils = app.utils || {};
    (app.utils as any).devTools = service;
    app.registerService?.('devTools', () => service as any);

    if (typeof window !== 'undefined') {
      (window as any).__ux3DevTools = service;
    }

    service.emit('system', 'dev-tools.installed', {
      inspector: flags.inspector,
      devTools: flags.devTools,
    });
  },
};

export function mountInspector(appContext: any): void {
  const flags = resolveDevToolsFlags(appContext.config);
  if (!flags.inspector || typeof window === 'undefined' || typeof document === 'undefined') return;

  const existing = document.getElementById('ux3-devtools-inspector');
  if (existing) return;

  const { root, dispose } = createInspectorShell(appContext, {
    dock: 'bottom-right',
    minimized: true,
  });
  document.body.appendChild(root);

  window.addEventListener('beforeunload', () => {
    try { dispose(); } catch { /* noop */ }
    root.remove();
  }, { once: true });
}
