/**
 * AppContextBuilder - Dependency Injection Container
 * Wires generated configuration into a live AppContext
 */

import { StateMachine } from '../fsm/state-machine.js';
import { FSMRegistry } from '../fsm/registry.js';
import type { StateConfig } from '../fsm/types.js';
import { HttpService } from '../services/http.js';
import { LogLevel } from '../security/observability.js';
import { WebSocketService } from '../services/websocket.js';
import { JSONRPCService } from '../services/jsonrpc.js';
import { Router } from '../services/router.js';
import type { Service, ServiceConfig } from '../services/types.js';
import path from 'path';
import type { NavConfig } from '../services/router.js';
import { WidgetFactory } from './widget/factory.js';
import type { AppContext } from './app.js';
import type { ContentManifest } from '../services/content.js';
import { HandlebarsLite } from '../hbs/index.js';
import { registerStyles, initStyleRegistry } from './style-registry.js';

/**
 * Generated configuration structure
 */
export interface GeneratedConfig {
  routes: Array<{ path: string; view: string }>;
  services: Record<string, { type: string; config: ServiceConfig }>;
  machines: Record<string, StateConfig<any>>;
  i18n: Record<string, Record<string, string>>;
  widgets: Record<string, { path: string; lazy?: boolean }>;
  styles: Record<string, string>;
  templates: Record<string, Record<string, string>>;
  // additional fields that may be added at build time
  version?: string;
  site?: Record<string, any>;
  development?: {
    logging?: LogLevel;
    hotReload?: boolean;
    inspector?: boolean;
  };
  content?: ContentManifest;
}

/**
 * AppContextBuilder - Fluent DI container builder
 * Transforms generated config into a live runtime context
 */
export class AppContextBuilder {
  private config: GeneratedConfig;
  private machines: Map<string, StateMachine<any>> = new Map();
  private services: Map<string, Service> = new Map();
  private widgets: WidgetFactory | null = null;
  private i18nData: Record<string, Record<string, string>> = {};
  private templates: Record<string, Record<string, string>> = {};
  private styles: Record<string, string> = {};
  private router: Router | null = null;
  private errorHandlers: Array<(error: Error) => void> = [];
  private buildErrors: Error[] = [];
  constructor(config: GeneratedConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(): void {
    if (!this.config.routes) {
      throw new Error('Invalid config: missing routes');
    }
    if (!this.config.services) {
      throw new Error('Invalid config: missing services');
    }
    if (!this.config.machines) {
      throw new Error('Invalid config: missing machines');
    }
  }

  /**
   * Build FSM registry - instantiate all state machines
   */
  withMachines(): this {
    try {
      for (const [name, machineConfig] of Object.entries(this.config.machines)) {
        const machine = new StateMachine(machineConfig);
        this.machines.set(name, machine);

        // debug log creation
        import('../security/observability.js').then(({ defaultLogger }) => {
          defaultLogger.debug('machine.initialized', { name });
        });

        // Subscribe to state changes for telemetry (and will be logged if debug)
        machine.subscribe((state, context) => {
          this.emitTelemetry(`fsm:transition`, {
            machine: name,
            state,
            context,
            timestamp: Date.now(),
          });
        });
      }
    } catch (error) {
      this.handleError(new Error(`Failed to build machines: ${error}`));
    }

    return this;
  }

  /**
   * Build service container - instantiate all service clients
   */
  withServices(): this {
    try {
      for (const [name, serviceSpec] of Object.entries(
        this.config.services
      )) {
        const service = this.createService(name, serviceSpec);
        this.services.set(name, service);
        import('../security/observability.js').then(({ defaultLogger }) => {
          defaultLogger.debug('service.initialized', { name, type: serviceSpec.type });
        });
      }
    } catch (error) {
      this.handleError(new Error(`Failed to build services: ${error}`), true);
    }

    return this;
  }

  /**
   * Create service instance based on type
   */
  private createService(
    name: string,
    spec: { type: string; config: ServiceConfig }
  ): Service {
    switch (spec.type) {
      case 'http':
        return new HttpService(spec.config);
      case 'websocket':
        // config may not strictly match WebSocketConfig but is assumed to contain url
        return new WebSocketService(spec.config as any);
      case 'jsonrpc':
        return new JSONRPCService(spec.config);
      case 'mock':
        // Mock service returns predefined responses
        return {
          async fetch(_req: any) {
            return { success: true };
          },
          async call(method: string, params?: any) {
            return { success: true, method, params };
          },
        };
      default:
        throw new Error(`Unknown service type: ${spec.type}`);
    }
  }

  /**
   * Build widget factory - setup lazy-loading
   */
  withWidgets(): this {
    try {
      this.widgets = new WidgetFactory();

      // Register all widgets
      for (const [name, spec] of Object.entries(this.config.widgets || {})) {
        if (spec.lazy) {
          // Lazy-load widget - loader handles missing module gracefully
          this.widgets.registerLazy(name, async () => {
            try {
              const module = await import(spec.path);
              return module.default || module;
            } catch (e) {
              console.warn(`[AppContextBuilder] Failed to lazy-load widget ${name}: ${e}`);
              return null;
            }
          });
        } else {
          // Sync-load widget - handle missing module gracefully
          try {
            // Use require for synchronous loading
            // Resolve relative paths safely
            const widget = require(spec.path);
            this.widgets.register(name, widget.default || widget);
          } catch (e) {
            console.warn(`[AppContextBuilder] Failed to load widget ${name}: ${e}`);
            // Do not throw - widget loading failures are non-fatal in builder
          }
        }
      }
    } catch (error) {
      this.handleError(new Error(`Failed to build widgets: ${error}`));
    }

    return this;
  }

  /**
   * Build router – initialize NavConfig from routes and machines
   */
  withRouter(): this {
    try {
      // allow zero machines; router can still operate (will simply not block on
      // FSM-based navigation checks).  older tests passed an empty config and
      // we don't want to throw in that case.
      const i18n = this.i18nData['en'] || {};
      this.router = new Router(this.config.routes, this.machines, i18n);
    } catch (error) {
      this.handleError(new Error(`Failed to build router: ${error}`));
    }

    return this;
  }

  /**
   * Build i18n provider
   */
  withI18n(): this {
    try {
      this.i18nData = this.config.i18n || {};
    } catch (error) {
      this.handleError(new Error(`Failed to build i18n: ${error}`));
    }

    return this;
  }

  /**
   * Setup templates
   */
  withTemplates(): this {
    try {
      this.templates = this.config.templates || {};
    } catch (error) {
      this.handleError(new Error(`Failed to build templates: ${error}`));
    }

    return this;
  }

  /**
   * Setup styles
   */
  withStyles(): this {
    try {
      this.styles = this.config.styles || {};
    } catch (error) {
      this.handleError(new Error(`Failed to build styles: ${error}`));
    }

    return this;
  }

  /**
   * Register error handler
   */
  onError(handler: (error: Error) => void): this {
    this.errorHandlers.push(handler);
    return this;
  }

  /**
   * Handle errors during building
   */
  private handleError(error: Error, fatal: boolean = false): void {
    console.error('[AppContextBuilder]', error);
    if (fatal) this.buildErrors.push(error);
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (e) {
        console.error('[AppContextBuilder] Error handler failed:', e);
      }
    }
  }

  /**
   * Emit telemetry event
   */
  private emitTelemetry(eventType: string, data: any): void {
    // Telemetry can be sent to dashboard in dev or analytics in prod
    if (typeof window !== 'undefined' && (window as any).__ux3Telemetry) {
      (window as any).__ux3Telemetry(eventType, data);
    }
  }

  /**
   * Build and return AppContext
   */
  build(): AppContext {
    if (!this.widgets) {
      this.withWidgets();
    }

    if (!this.router) {
      this.withRouter();
    }

    const machines: Record<string, StateMachine<any>> = {};
    for (const [name, machine] of this.machines) {
      machines[name] = machine;
    }

    const services: Record<string, Service> = {};
    for (const [name, service] of this.services) {
      services[name] = service;
    }

    const i18nFn = (key: string, props?: Record<string, any>): string => {
      // Get current language (default to 'en')
      const lang =
        (typeof document !== 'undefined' && document.documentElement.lang) ||
        'en';
      const translations = this.i18nData[lang] || this.i18nData['en'] || {};

      let value = translations[key] || key;

      // Use HBS for interpolation (supports {{key}}, {{#if}}, {{#each}}, helpers, etc.)
      if (props) {
        const hbs = new HandlebarsLite();
        value = hbs.render(value, props);
      }

      return value;
    };

    const templateFn = (name: string): string => {
      // Return template string by name
      // Support both flat and nested templates structures
      if ((this.templates as any)[name]) return (this.templates as any)[name];

      for (const [, templates] of Object.entries(this.templates)) {
        if (templates && (templates as any)[name]) {
          return (templates as any)[name];
        }
      }

      console.warn(`[AppContextBuilder] Template not found: ${name}`);
      return '';
    };

    const navConfig: NavConfig | null = this.router ? this.router.getNavConfig() : null;

    const context: AppContext = {
      machines,
      services,
      widgets: this.widgets!,
      styles: this.styles,
      ui: {},
      template: templateFn,
      i18n: i18nFn,
      nav: navConfig,
      config: this.config,
    };

    // helper methods for plugin authors/runtime
    context.registerAsset = (asset) => {
      // will throw if config.site missing to catch mis-use
      if (!this.config.site) {
        throw new Error('app.config.site is not initialized');
      }
      this.config.site.assets = this.config.site.assets || [];
      this.config.site.assets.push(asset);
    };

    context.registerService = (name, factory) => {
      if (context.services[name]) {
        console.warn(`[AppContext] service ${name} already exists, overwriting`);
      }
      context.services[name] = factory();
    };

    context.registerComponent = (name, factory) => {
      context.widgets.register(name, factory);
    };

    context.registerView = (name, template) => {
      // add to templates store so templateFn will find it
      (this.templates as any)[name] = template;
    };

    context.registerRoute = (path, viewName) => {
      if (!this.router) {
        throw new Error('router not initialized; call withRouter before registering routes');
      }
      this.router.addRoute(path, viewName);
      // refresh nav config
      context.nav = this.router.getNavConfig();
    };

    context.registerMachine = (namespace, fsm) => {
      FSMRegistry.register(namespace, fsm);
      context.machines[namespace] = fsm;
    };

    context.registerPlugin = async (plugin) => {
      if (!plugin || typeof plugin.install !== 'function') {
        throw new Error('Invalid plugin');
      }
      // call install; return promise so callers can await if needed
      try {
        const result = plugin.install(context as any);
        if (result && typeof (result as Promise<any>).then === 'function') {
          try {
            await result;
          } catch (e) {
            console.error('[AppContext] plugin install failed', e);
          }
        }
      } catch (err) {
        console.error('[AppContext] plugin install failed', err);
      }
    };

    // keep a global style registry in sync so that runtime class injection works
    registerStyles(context.styles || {});
    initStyleRegistry();

    // Export globally for testing/debugging
    if (typeof window !== 'undefined') {
      (window as any).__ux3App = context;
    }

    if (this.buildErrors.length > 0) {
      throw new Error('Build failed');
    }

    return context;
  }
}

export interface HydrationOptions {
  recoverState?: boolean;
  reattachListeners?: boolean;
  reconnectServices?: boolean;
  validateVersion?: boolean;
}

/**
 * Hydrate an already-rendered server page into a live SPA.
 *
 * This utility is used by the bootstrap helper and internal tests.  It is
 * intentionally lightweight: the generated config is passed straight through to
 * `createAppContext` and a few optional helpers are invoked based on the
 * provided options.  Projects may call this directly but most consumers will
 * prefer `@ux3/ui/bootstrap` which wraps it and handles window/DesktopLoaded
 * logic.
 */
export async function hydrate(
  config: GeneratedConfig,
  options: HydrationOptions = {}
): Promise<AppContext> {
  const app = await createAppContext(config);

  if (options.recoverState && typeof window !== 'undefined') {
    const initial = (window as any).__INITIAL_STATE__;
    if (initial && typeof (app as any).recoverState === 'function') {
      (app as any).recoverState(initial);
    }
  }

  if (options.reattachListeners && typeof (app as any).reattachListeners === 'function') {
    (app as any).reattachListeners();
  }

  if (options.reconnectServices) {
    try {
      await (app as any).reconnectServices?.();
    } catch (err) {
      console.warn('[UX3] service reconnection failed', err);
    }
  }

  return app;
}

/**
 * Quick helper to build AppContext from generated config
 */
export async function createAppContext(
  config: GeneratedConfig
): Promise<AppContext> {
  // prepare logger if we need to touch it
  let defaultLogger: typeof import('../security/observability').defaultLogger | null = null;


  if (
    config.development &&
    (config.development.logging || config.development.inspector)
  ) {
    // synchronously load the module so we can configure before building
    const mod = await import('../security/observability.js');
    defaultLogger = mod.defaultLogger;

    if (config.development.logging) {
      defaultLogger.config.minLevel = config.development
        .logging as LogLevel;
    }

    if (
      config.development.logging === 'debug' &&
      typeof window !== 'undefined'
    ) {
      window.__ux3Telemetry = (evt: string, data: any) => {
        defaultLogger!.debug(evt, data);
      };
    }
  }

  const context = new AppContextBuilder(config)
    .withMachines()
    .withServices()
    .withWidgets()
    .withI18n()
    .withTemplates()
    .withStyles()
    .build();

  // if content manifest was generated, install the built-in content plugin
  if ((config as any).content) {
    try {
      const { ContentPlugin } = await import('../services/content-plugin.js');
      if (context.registerPlugin) {
        await context.registerPlugin(ContentPlugin);
      }
    } catch (e) {
      // ignore if we can't load (e.g. plugin not available)
    }
  }

  // auto-install plugins listed in config
  if (config.plugins && Array.isArray(config.plugins)) {
    for (const entry of config.plugins) {
      try {
        let plugin: any = null;
        if (typeof entry === 'string') {
          // import by package name or path. if resolution fails try workspace
          // package source so tests can load local packages.
          const pkgName = entry;
          try {
            plugin = await import(/* @vite-ignore */ pkgName);
          } catch (e) {
            // try require
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              plugin = require(pkgName);
            } catch (err2) {
              // attempt to load from workspace packages folder
              if (pkgName.startsWith('@ux3/plugin-')) {
                const simple = pkgName.replace('@ux3/', '');
                const localPath = path.join(process.cwd(), 'packages/@ux3', simple, 'src', 'index.ts');
                try {
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  plugin = require(localPath);
                } catch (err3) {
                  throw e; // rethrow original
                }
              } else {
                throw e;
              }
            }
          }
          plugin = plugin?.default || plugin;
        } else if (entry && entry.name) {
          // entry may specify configuration or be object
          try {
            const mod = await import(/* @vite-ignore */ entry.name);
            plugin = mod.default || mod;
          } catch {
            // ignore load failure
          }
          // merge config onto plugin if provided
          if (plugin && entry.config) {
            plugin.config = { ...(plugin.config || {}), ...entry.config };
          }
        }
        if (plugin && context.registerPlugin) {
          await context.registerPlugin(plugin);
        }
      } catch (err) {
        console.warn('[AppContext] failed to install plugin', entry, err);
      }
    }
  }

  // inspector: attach context to window and log
  if (
    config.development &&
    config.development.inspector &&
    typeof window !== 'undefined'
  ) {
    (window as any).__ux3Inspector = context;
    if (defaultLogger) {
      defaultLogger.debug('inspector enabled', {});
    }

    // synchronously load the inspector component and mount it before
    // returning so callers (and tests) can rely on its presence.
    try {
      await import('./inspector-widget.js');
      // make sure we don't stack multiple overlays when called repeatedly
      const existing = document.body.querySelector('ux3-inspector');
      if (existing) existing.remove();
      const el = document.createElement('ux3-inspector');
      document.body.appendChild(el);
    } catch (err) {
      console.warn('[AppContextBuilder] failed to mount inspector element', err);
    }
  }

  return context;
}
