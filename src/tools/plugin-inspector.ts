import { PluginRegistry } from '../plugin/registry';

// simple global inspector attached to window for development

export function installInspector(registry: PluginRegistry): void {
  if (typeof window === 'undefined') return;
  const ins: any = {};

  ins.plugins = () => registry.list();
  ins.plugin = (name: string) => registry.load(name);
  ins.hooks = (phase?: string) => {
    // aggregate hooks across all plugins
    const map: Record<string, any[]> = {};
    for (const p of registry.list()) {
      if (p.hooks) {
        for (const domain of Object.keys(p.hooks)) {
          const sub = (p.hooks as any)[domain];
          for (const ph of Object.keys(sub || {})) {
            map[ph] = map[ph] || [];
            map[ph].push({ plugin: p.name, handlers: (sub)[ph] });
          }
        }
      }
    }
    if (phase) return map[phase] || [];
    return map;
  };
  ins.loggerEntries = () => (window as any).__loggerEntries || [];

  // expose
  (window as any).__pluginInspector = ins;
}

// call from app initialization
export default installInspector;
