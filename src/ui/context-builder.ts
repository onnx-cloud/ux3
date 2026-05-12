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
import { registerBuiltInPrimitives } from './widget/primitives/index.js';
import { setupNavigation } from './navigation-handler.js';
import { HookRegistry, ServiceLifecyclePhase } from '../core/lifecycle.js';
import { captureBrowserContext, observeBrowserContext, type BrowserContextOptions } from './browser-context.js';
import type { GeneratedEntities } from '../build/entity-index.js';
import type { Plugin } from '../plugin/registry.js';
import { builtInDevToolsPlugin, mountInspector } from './plugins/built-in.js';
import { createLocaleService, type LocaleService } from '../services/locale-runtime.js';
import { createAppFSM, transitionAppFSM, type AppFSMContext } from './app-fsm.js';
import { DEFAULT_STYLES } from '../build/default-styles.js';

function injectTokenCss(tokens: Record<string, any>): void {
  const lightLines: string[] = [];
  const darkLines: string[] = [];
  const flatten = (arr: string[], obj: Record<string, any>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const prop = `${prefix}-${k}`;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        flatten(arr, v, prop);
      } else if (typeof v === 'string' || typeof v === 'number') {
        arr.push(`  ${prop}: ${v};`);
      }
    }
  };

  const hasColors = tokens.colors || (tokens as any).Colors;
  if (hasColors) {
    const light = (hasColors as any).light;
    const dark = (hasColors as any).dark;
    if (light && typeof light === 'object') flatten(lightLines, light, '--color');
    if (dark && typeof dark === 'object') flatten(darkLines, dark, '--color');
  }
  if (tokens.spacing && typeof tokens.spacing === 'object') flatten(lightLines, tokens.spacing, '--spacing');
  if (tokens.typography && typeof tokens.typography === 'object') flatten(lightLines, tokens.typography, '--typography');

  if (lightLines.length > 0 || darkLines.length > 0) {
    const style = document.createElement('style');
    style.id = 'ux3-tokens';
    let css = `:root {\n${lightLines.join('\n')}`;
    css += `\n  font-family: Inter, system-ui, sans-serif;`;
    css += `\n  color: var(--color-text, #0f172a);`;
    css += `\n  background-color: var(--color-bg, #ffffff);`;
    css += `\n}`;
    if (darkLines.length > 0) {
      css += `\n[data-color-scheme="dark"] {\n${darkLines.join('\n')}\n}`;
    }
    style.textContent = css;
    document.head.appendChild(style);
  }
}

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
        const machineId = (machineConfig as any).id || name;
        FSMRegistry.register(machineId, machine);

        // debug log creation
        import('../security/observability.js').then(({ defaultLogger }) => {
          defaultLogger.debug('machine.initialized', { name, id: machineId });
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
        try { (service as any).name = name; } catch { Object.defineProperty(service, 'name', { value: name, writable: true, configurable: true }); }
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

    context.registerRoute = (path, viewName, label?, parent?) => {
      if (!this.router) {
        throw new Error('router not initialized; call withRouter before registering routes');
      }
      this.router.addRoute(path, viewName, label, parent);
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
    // ConfigGenerator already seeded config.styles with DEFAULT_STYLES, but we
    // re-register here to guarantee availability even for SSR-less bootstraps.
    registerStyles(DEFAULT_STYLES);
    registerStyles(context.styles || {});
    registerBuiltInPrimitives();
    initStyleRegistry();

    // Inject CSS custom properties from ux/token/*.yaml so that var(--color-*)
    // references in style classes resolve to the correct theme values.
    if (this.config.tokens && typeof document !== 'undefined') {
      try { injectTokenCss(this.config.tokens); } catch { /* token CSS injection is best-effort */ }
    }

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

    context.destroy = (): void => {
      for (const [name, service] of Object.entries(context.services)) {
        if (service && typeof (service as any).destroy === 'function') {
          try { (service as any).destroy(); } catch (e) { /* best effort */ }
        }
      }
      for (const [name, machine] of Object.entries(context.machines)) {
        try { machine.reset(); } catch { /* best effort */ }
      }
    };

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
  /** Hook to install browser-side plugins after context creation, before FSMs start. */
  installPlugins?: (app: AppContext) => Promise<void>;
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
  defaultLogger.info('[AppContext] hydrate start', { hasPlugins: !!options.installPlugins });
  const app = await createAppContext(config);

  if (options.installPlugins) {
    defaultLogger.info('[AppContext] installing plugins via hook');
    await options.installPlugins(app);
    defaultLogger.info('[AppContext] plugins installed', { services: Object.keys(app.services) });
  }

  // Wire client-side routing AFTER plugins are installed so invokers have services.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      setupNavigation(app);
    } catch (err) {
      defaultLogger.warn('[AppContext] setupNavigation failed', { error: String(err) });
    }
  }

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

  // Install plugins from config — only built-in plugins are handled here.
  // CDN-based plugin services (maps, graphs, charts, auth) are registered
  // via the generated installPlugins() hook called by hydrate().
  const entries: any[] = Array.isArray(config.plugins) ? [...config.plugins] : [];

  // Auto-install dev-tools when development mode is enabled
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
    } catch { /* skip broken entries */ }
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

  // Bridge all framework logger output into the devtools event stream.
  // Without this bridge, framework logs are invisible when devtools is open
  // (they go to console.log but devtools captures events, not console output).
  if (typeof window !== 'undefined' && (window as any).__ux3DevTools) {
    try {
      const devTools = (window as any).__ux3DevTools;
      const levels = ['debug', 'info', 'warn', 'error'] as const;
      const originals: Record<string, Function> = {};
      for (const level of levels) {
        const orig = (defaultLogger as any)[level];
        if (typeof orig !== 'function') continue;
        originals[level] = orig.bind(defaultLogger);
        (defaultLogger as any)[level] = (...args: any[]) => {
          originals[level](...args);
          const message = typeof args[0] === 'string' ? args[0] : '';
          const context = args.length > 1 && typeof args[args.length - 1] === 'object' ? args[args.length - 1] : undefined;
          devTools.emit('logger', level, { message, context, timestamp: Date.now() });
        };
      }
    } catch {
      // Logger bridge unavailable — logs go to console only
    }
  }

  // Transition FSM through service lifecycle phases
  await transitionAppFSM(appFSM, 'BUILD_COMPLETE', context);
  await transitionAppFSM(appFSM, 'SERVICES_CONNECTED', context);

  await transitionAppFSM(appFSM, 'ROUTING_READY', context);

  return context;
}
