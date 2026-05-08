/**
 * AppContextBuilder - Dependency Injection Container
 * Wires generated configuration into a live AppContext
 */

import { StateMachine } from '../fsm/state-machine.js';
import { FSMRegistry } from '../fsm/registry.js';
import type { StateConfig } from '../fsm/types.js';
import { ServiceFactory } from '../services/service-factory.js';
import { LogLevel, defaultLogger } from '../security/observability.js';
import { Router } from '../services/router.js';
import type { Service, ServiceConfig } from '../services/types.js';
import { InvokeRegistry } from '../services/invoke-registry.js';
import * as path from 'path';
import type { NavConfig } from '../services/router.js';
import { WidgetFactory } from './widget/factory.js';
import type { AppContext } from './app.js';
import type { ContentManifest } from '../services/content.js';
import { HandlebarsLite } from '../hbs/index.js';
import { registerStyles, initStyleRegistry } from './style-registry.js';
import { setupNavigation } from './navigation-handler.js';
import { HookRegistry, ServiceLifecyclePhase } from '../core/lifecycle.js';
import { captureBrowserContext, observeBrowserContext, type BrowserContextOptions } from './browser-context.js';
import type { GeneratedEntities } from '../build/entity-index.js';
import type { Plugin } from '../plugin/registry.js';
import { builtInDevToolsPlugin, mountInspector } from './plugins/built-in.js';
import { createLocaleService, type LocaleService } from '../services/locale-runtime.js';
import { createAppFSM, transitionAppFSM, type AppFSMContext } from './app-fsm.js';

/**
 * Generated configuration structure
 */
export interface GeneratedConfig {
  routes: Array<{ path: string; view: string }>;
  services: Record<string, { type?: string; adapter?: string; config?: ServiceConfig; [key: string]: any }>;
  machines: Record<string, StateConfig<any>>;
  i18n: Record<string, Record<string, string>>;
  tokens?: Record<string, unknown>;
  widgets: Record<string, { path: string; lazy?: boolean }>;
  styles: Record<string, string>;
  templates: Record<string, Record<string, string>>;
  plugins?: Array<string | any>;
  // additional fields that may be added at build time
  version?: string;
  site?: Record<string, any>;
  development?: {
    logging?: LogLevel;
    hotReload?: boolean;
    inspector?: boolean;
    devTools?: boolean;
  };
  oauth?: Record<string, Record<string, unknown>>;
  content?: ContentManifest;
  browserContext?: BrowserContextOptions;
  entities?: GeneratedEntities;
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
  private hooks: HookRegistry = new HookRegistry();
  private stopBrowserObserver: (() => void) | null = null;
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
        const machine = new StateMachine(machineConfig as any);
        this.machines.set(name, machine);
        // Register in FSMRegistry so navigation handler can look up by name
        FSMRegistry.register(name, machine);

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
          this.emitDevTools('fsm', 'transition', {
            machine: name,
            state,
            context,
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
        // log incoming spec for diagnostics
        import('../security/observability.js').then(({ defaultLogger }) => {
          defaultLogger.debug('service.spec', { name, spec: serviceSpec });
        });
        const service = ServiceFactory.create(name, serviceSpec);
        // Attach name to service so hooks can identify it, guard against non-writable .name
        if (service && !(service as any).name) {
          try { (service as any).name = name; } catch { Object.defineProperty(service, 'name', { value: name, writable: true, configurable: true }); }
        }
        this.services.set(name, service);
        
        // Emit REGISTER lifecycle phase for this service
        void this.hooks.execute(ServiceLifecyclePhase.REGISTER, {
          phase: ServiceLifecyclePhase.REGISTER,
          service,
          meta: { serviceName: name, serviceType: serviceSpec.type || serviceSpec.adapter }
        });
        
        import('../security/observability.js').then(({ defaultLogger }) => {
          defaultLogger.debug('service.initialized', { name, type: serviceSpec.type, adapter: serviceSpec.adapter });
        });
        this.emitDevTools('service', 'registered', { name, type: serviceSpec.type, adapter: serviceSpec.adapter });
      }
    } catch (error) {
      this.handleError(new Error(`Failed to build services: ${error}`), true);
    }

    return this;
  }

  /**
   * Create service instance based on type
   */
  /**
   * Build widget factory - setup lazy-loading
   */
  withWidgets(): this {
    const resolveWidgetPath = (widgetPath: string): string | undefined => {
      if (path.isAbsolute(widgetPath)) return widgetPath;
      const candidates = [
        path.resolve(process.cwd(), widgetPath),
        path.resolve(process.cwd(), 'src/ui/widget', widgetPath),
        path.resolve(process.cwd(), 'src/ui', widgetPath),
      ];

      if (typeof process !== 'undefined' && process.release?.name === 'node') {
        try {
          // Resolve fs at runtime only so bundlers do not statically include it.
          const fs = new Function('id', 'return require(id)')('fs');
          for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
              return candidate;
            }
          }
        } catch {
          // ignore if fs is unavailable in this environment
        }
      }

      return undefined;
    };

    try {
      this.widgets = new WidgetFactory();

      // Register all widgets
      for (const [name, spec] of Object.entries(this.config.widgets || {})) {
        const resolvedPath = resolveWidgetPath(spec.path);
        if (!resolvedPath) {
          // Skip unresolved widget paths instead of generating noisy warnings during build/test.
          continue;
        }

        if (spec.lazy) {
          // Lazy-load widget - loader handles missing module gracefully
          this.widgets.registerLazy(name, async () => {
            try {
              const module = await import(resolvedPath);
              return module.default || module;
            } catch (e) {
              defaultLogger.warn(`[AppContextBuilder] Failed to lazy-load widget ${name}`, { error: String(e) });
              return null;
            }
          });
        } else {
          // Sync-load widget - handle missing module gracefully
          try {
            // Use require for synchronous loading
            const widget = require(resolvedPath);
            this.widgets.register(name, widget.default || widget);
          } catch (e) {
            defaultLogger.warn(`[AppContextBuilder] Failed to load widget ${name}`, { error: String(e) });
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
    import('../security/observability.js').then(({ defaultLogger }) => {
      defaultLogger.error('[AppContextBuilder] Build error', error);
    });
    if (fatal) this.buildErrors.push(error);
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (e) {
        import('../security/observability.js').then(({ defaultLogger }) => {
          defaultLogger.error('[AppContextBuilder] Error handler failed', e instanceof Error ? e : new Error(String(e)));
        });
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
   * Emit a devtools event when the devtools service is available.
   */
  private emitDevTools(source: string, type: string, payload?: any): void {
    if (typeof window === 'undefined') return;
    const devTools = (window as any).__ux3DevTools;
    if (devTools && typeof devTools.emit === 'function') {
      devTools.emit(source, type, { ...(payload || {}), timestamp: Date.now() });
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
      // Use locale service language, fallback to document lang or 'en'
      const lang = localeService.locale?.language ||
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

      defaultLogger.warn(`[AppContextBuilder] Template not found: ${name}`);
      return '';
    };

    const navConfig: NavConfig | null = this.router ? this.router.getNavConfig() : null;
    const rawBrowserContext = captureBrowserContext(this.config.browserContext || {});

    const translatePluginLocales: string[] = (() => {
      const entries = Array.isArray(this.config.plugins) ? this.config.plugins : [];
      for (const entry of entries) {
        const name = typeof entry === 'string' ? entry : entry?.name;
        if (name !== '@ux3/plugin-translate') continue;
        const cfg = (typeof entry === 'object' && entry?.config) ? entry.config : null;
        if (cfg && Array.isArray(cfg.locales)) return cfg.locales as string[];
      }
      return [];
    })();

    const supportedLocales = Array.from(new Set([
      ...Object.keys(this.i18nData),
      ...translatePluginLocales,
    ]));

    const localeService = createLocaleService({
      defaultLocale: 'en-US',
      supportedLocales: supportedLocales.length > 0 ? supportedLocales : undefined,
    });
    const resolvedLocale = localeService.resolve();

    // Stabilize browser context with resolved locale before first render.
    rawBrowserContext.locale = {
      primary: resolvedLocale.primary,
      language: resolvedLocale.language,
      region: resolvedLocale.region,
      preferred: resolvedLocale.preferred,
      direction: resolvedLocale.direction,
      reliability: resolvedLocale.source === 'default' ? 'low' : 'high',
    };

    const browserContext = rawBrowserContext;

    const renderFn = (template: string, props?: Record<string, any>): string => {
      // Render template through Handlebars with provided context
      if (!template) return '';
      
      const hbs = new HandlebarsLite();
      const lang = localeService.locale?.language ||
        (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
      const context = {
        ...props,
        i18n: this.i18nData[lang] || this.i18nData['en'] || {},
        nav: navConfig,
        ...(this.config.site || {}),
      };
      
      return hbs.render(template, context);
    };

    const context: AppContext = {
      machines,
      services,
      browser: browserContext,
      widgets: this.widgets!,
      styles: this.styles,
      ui: {},
      template: templateFn,
      render: renderFn,
      i18n: i18nFn,
      nav: navConfig,
      config: this.config,
      hooks: this.hooks,
      locale: localeService,
    };

    // Keep browser context available from both app.browser and app.ui.browser.
    (context.ui as any).browser = browserContext;

    // Initialize InvokeRegistry after context is created (needs circular reference resolved)
    // Use a proxy to delay initialization until all properties are set
    Object.defineProperty(context, 'invokeRegistry', {
      configurable: true,
      get: () => {
        if (!context._invokeRegistry) {
          context._invokeRegistry = new InvokeRegistry(context as any);
          
          // Phase 1.2.3: Register InvokeRegistry with all FSMs for centralized invoke handling
          for (const [, fsm] of this.machines) {
            (fsm as any).setInvokeRegistry(context._invokeRegistry);
          }
        }
        return context._invokeRegistry;
      },
      set: (value) => {
        context._invokeRegistry = value;
        
        // When InvokeRegistry is set externally, register with all FSMs
        for (const [, fsm] of this.machines) {
          (fsm as any).setInvokeRegistry(value);
        }
      }
    });

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
        defaultLogger.warn(`[AppContext] service ${name} already exists, overwriting`);
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
      // Register plugin hooks if present
      if (plugin.hooks && context.hooks) {
        for (const [phase, handlers] of Object.entries(plugin.hooks.app || {})) {
          for (const handler of (handlers || [])) {
            context.hooks.on(phase, handler);
          }
        }
      }
      // call install; return promise so callers can await if needed
      try {
        const result = plugin.install(context as any);
        if (result && typeof (result as Promise<any>).then === 'function') {
          try {
            await result;
          } catch (e) {
            defaultLogger.error('[AppContext] plugin install failed', e instanceof Error ? e : new Error(String(e)));
          }
        }
      } catch (err) {
        defaultLogger.error('[AppContext] plugin install failed', err instanceof Error ? err : new Error(String(err)));
      }
    };

    // keep a global style registry in sync so that runtime class injection works
    registerStyles(context.styles || {});
    initStyleRegistry();

    // Live browser context updates for guards/services/ui consumers.
    this.stopBrowserObserver?.();
    this.stopBrowserObserver = observeBrowserContext((nextContext) => {
      // Reflect resolved locale into browser snapshot
      const resolved = localeService.resolve();
      nextContext.locale = {
        primary: resolved.primary,
        language: resolved.language,
        region: resolved.region,
        preferred: resolved.preferred,
        direction: resolved.direction,
        reliability: resolved.source === 'default' ? 'low' : 'high',
      };
      context.browser = nextContext;
      (context.ui as any).browser = nextContext;
    }, this.config.browserContext || {});

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
      defaultLogger.warn('[UX3] service reconnection failed', { error: String(err) });
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
    (config.development.logging || config.development.inspector || config.development.devTools)
  ) {
    // synchronously load the module so we can configure before building
    const mod = await import('../security/observability.js');
    defaultLogger = mod.defaultLogger;

    if (config.development.logging) {
      (defaultLogger as any).setMinLevel?.(config.development.logging);
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

  // Create the app root FSM — models the lifecycle as inspectable states
  const appFSM = createAppFSM();
  context.appFSM = appFSM;
  transitionAppFSM(appFSM, 'CONFIG_READY', context);

  const recordInstalledPlugin = (plugin: Plugin): void => {
    const devTools = (context.utils as any)?.devTools;
    if (!devTools || typeof devTools.recordPlugin !== 'function') {
      return;
    }

    const hookNames = new Set<string>();
    for (const domain of Object.values(plugin.hooks || {})) {
      for (const phase of Object.keys(domain || {})) {
        hookNames.add(phase);
      }
    }

    devTools.recordPlugin({
      name: plugin.name,
      version: plugin.version,
      hooks: Array.from(hookNames),
      status: 'active',
    });
    devTools.emit('plugin', 'installed', {
      name: plugin.name,
      version: plugin.version,
      hooks: Array.from(hookNames),
    });
  };

  // Install plugins from config (dev-tools is built-in, others via dynamic import for Node.js).
  // Browser build: the generated __entry__.ts calls installPlugins() after createAppContext().
  const entries: any[] = Array.isArray(config.plugins) ? [...config.plugins] : [];

  // Dev-tools is always available as a framework feature
  const hasDevTools = entries.some((e: any) =>
    (typeof e === 'string' ? e : e?.name) === '@ux3/plugin-dev-tools'
  );
  if ((config.development?.inspector || config.development?.devTools) && !hasDevTools) {
    entries.unshift('@ux3/plugin-dev-tools');
  }

  for (const entry of entries) {
    try {
      const pkgName = typeof entry === 'string' ? entry : entry?.name;
      if (!pkgName) continue;
      if (pkgName === '@ux3/plugin-dev-tools') {
        if (context.registerPlugin) {
          await context.registerPlugin(builtInDevToolsPlugin);
          recordInstalledPlugin(builtInDevToolsPlugin);
        }
        continue;
      }
      // Node.js-only fallback: try loading from workspace packages or filesystem paths
      if (typeof process !== 'undefined') {
        try {
          let loadPath: string;
          if (pkgName.startsWith('@ux3/plugin-')) {
            const simple = pkgName.replace('@ux3/', '');
            loadPath = require('path').join(process.cwd(), 'packages/@ux3', simple, 'src', 'index.ts');
          } else {
            loadPath = pkgName; // filesystem path
          }
          let plugin = require(loadPath);
          plugin = plugin?.default || plugin;
          if (typeof entry === 'object' && entry.config) {
            plugin.config = { ...(plugin.config || {}), ...entry.config };
          }
          if (context.registerPlugin && plugin) {
            await context.registerPlugin(plugin);
            recordInstalledPlugin(plugin);
          }
        } catch { /* Node.js plugin not found */ }
      }
    } catch { /* plugin load failed */ }
  }

  // if content manifest was generated, install the built-in content plugin
  if ((config as any).content) {
    try {
      const { ContentPlugin } = await import('../services/content-plugin.js');
      if (context.registerPlugin) {
        await context.registerPlugin(ContentPlugin);
        recordInstalledPlugin(ContentPlugin as Plugin);
      }
    } catch (e) {
      defaultLogger.warn('[AppContext] content plugin not loaded', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  mountInspector(context);

  // Bridge framework logger output into the devtools event stream.
  if (typeof window !== 'undefined' && (window as any).__ux3DevTools) {
    try {
      if (typeof defaultLogger.warn !== 'function' || typeof defaultLogger.error !== 'function') {
        // Logger has been spied/mocked — skip bridge to avoid breaking tests
      } else {
        const devTools = (window as any).__ux3DevTools;
        const originalWarn = defaultLogger.warn.bind(defaultLogger);
        const originalError = defaultLogger.error.bind(defaultLogger);
        defaultLogger.warn = (message: string, context?: Record<string, unknown>) => {
          originalWarn(message, context);
          devTools.emit('logger', 'warn', { message, context });
        };
        defaultLogger.error = (message: string, error?: Error, context?: Record<string, unknown>) => {
          originalError(message, error, context);
          devTools.emit('logger', 'error', { message, error: error?.message, context });
        };
      }
    } catch {
      // Logger bridge unavailable
    }
  }

  // Transition FSM through service lifecycle phases
  await transitionAppFSM(appFSM, 'BUILD_COMPLETE', context);
  await transitionAppFSM(appFSM, 'SERVICES_CONNECTED', context);

  // Wire client-side routing: mounts the initial view and handles history events.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      setupNavigation(context);
    } catch (err) {
      defaultLogger.warn('[AppContext] setupNavigation failed', { error: String(err) });
    }
  }

  await transitionAppFSM(appFSM, 'ROUTING_READY', context);

  return context;
}
