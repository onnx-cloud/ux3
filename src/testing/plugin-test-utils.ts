import type { Plugin } from '../plugin/registry';
import { PluginRegistry } from '../plugin/registry';
import { HookRegistry } from '../core/lifecycle';
import type { AppContext } from '../ui/app';
import type { HookContext, Hook } from '../core/lifecycle';

export function createTestApp(plugins: Plugin[] = []): AppContext {
  // minimal stubbed context
  const ctx: any = {
    services: {},
    machines: {},
    widgets: {},
    ui: {},
    template: () => '',
    i18n: () => '',
    nav: null,
    config: {},
    hooks: new HookRegistry()
  };
  const reg = new PluginRegistry();
  plugins.forEach(p => reg.register(p));
  // install all and register lifecycle hooks
  reg.list().forEach(p => {
    p.install?.(ctx);
    if (p.hooks) {
      for (const domain of Object.keys(p.hooks)) {
        const phases = (p.hooks as any)[domain];
        for (const phase of Object.keys(phases)) {
          const handlers = phases[phase] || [];
          handlers.forEach((h: any) => {
            (ctx.hooks as any).on(phase, h);
          });
        }
      }
    }
  });
  // expose registry for introspection
  ctx.pluginRegistry = reg;
  return ctx as AppContext;
}

export function mockLogger(): any {
  const entries: any[] = [];
  return {
    log: (k: string, m?: any) => entries.push({ level: 'log', key: k, meta: m }),
    warn: (k: string, m?: any) => entries.push({ level: 'warn', key: k, meta: m }),
    error: (k: string, m?: any) => entries.push({ level: 'error', key: k, meta: m }),
    debug: (k: string, m?: any) => entries.push({ level: 'debug', key: k, meta: m }),
    subscribe: (fn: any) => {},
    entries
  };
}

export function mockService(name: string): any {
  return { name };
}

export async function executeHook(phase: string, context: HookContext): Promise<void> {
  if (!context.app || !(context.app as any).hooks) return;
  const registry: any = (context.app as any).hooks;
  if (typeof registry.execute === 'function') {
    await registry.execute(phase, context);
  } else {
    // fallback: nothing to run
  }
}
