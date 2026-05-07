/**
 * AppContextBuilder - Dependency Injection Container
 * Wires generated configuration into a live AppContext
 */

import { StateMachine } from '../fsm/state-machine.js';
import { FSMRegistry } from '../fsm/registry.js';
import type { StateConfig } from '../fsm/types.js';
import { ServiceFactory } from '../services/service-factory.js';
import { LogLevel } from '../security/observability.js';
import { Router } from '../services/router.js';
import type { Service, ServiceConfig } from '../services/types.js';
import { InvokeRegistry } from '../services/invoke-registry.js';
import * as path from 'path';
import type { NavConfig } from '../services/router.js';
import { WidgetFactory } from './widget/factory.js';
import type { AppContext } from './app.js';
import type { ContentManifest } from '../services/content.js';
import { HandlebarsLite } from '../logger/hbs/index.js';
import { registerStyles, initStyleRegistry } from './style-registry.js';
import { setupNavigation } from './navigation-handler.js';
import { HookRegistry, AppLifecyclePhase, ServiceLifecyclePhase } from '../core/lifecycle.js';
import { captureBrowserContext, observeBrowserContext, type BrowserContextOptions } from './browser-context.js';
import type { GeneratedEntities } from '../build/entity-index.js';
import type { Plugin } from '../plugin/registry.js';
import { createDevToolsService } from '../../packages/@ux3/plugin-dev-tools/src/services/dev-tools.service.js';

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

function resolveDevToolsFlags(config: any): { inspector: boolean; devTools: boolean } {
  const pluginEntries = Array.isArray(config?.plugins) ? config.plugins : [];

  let pluginEnabled = false;
  let pluginInspector = false;
  let pluginDevTools = false;

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

const builtInDevToolsPlugin: Plugin = {
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
        // Attach name to service so hooks can identify it
        (service as any).name = name;
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
              console.warn(`[AppContextBuilder] Failed to lazy-load widget ${name}: ${e}`);
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
    
    // Emit CONNECT lifecycle phase for all services
    for (const [name, service] of this.services) {
      void this.hooks.execute(ServiceLifecyclePhase.CONNECT, {
        phase: ServiceLifecyclePhase.CONNECT,
        service,
        meta: { serviceName: name }
      });
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
    const browserContext = captureBrowserContext(this.config.browserContext || {});

    const renderFn = (template: string, props?: Record<string, any>): string => {
      // Render template through Handlebars with provided context
      if (!template) return '';
      
      const hbs = new HandlebarsLite();
      const lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
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

    // Live browser context updates for guards/services/ui consumers.
    this.stopBrowserObserver?.();
    this.stopBrowserObserver = observeBrowserContext((nextContext) => {
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
  };

  const mountInspectorCompatibilityUI = (appContext: AppContext): void => {
    const flags = resolveDevToolsFlags(config);
    if (!flags.inspector || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const existing = document.getElementById('ux3-devtools-inspector');
    if (existing) {
      return;
    }

    const root = document.createElement('aside');
    root.id = 'ux3-devtools-inspector';
    root.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'width:min(460px,calc(100vw - 24px))',
      'max-height:70vh',
      'background:#0f172a',
      'color:#e2e8f0',
      'border:1px solid #334155',
      'border-radius:10px',
      'box-shadow:0 20px 50px rgba(15,23,42,0.45)',
      'font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
      'overflow:hidden',
      'opacity:0.5',
      'transition:opacity 140ms ease',
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#111827;border-bottom:1px solid #334155;cursor:move;user-select:none;gap:8px;';

    const title = document.createElement('strong');
    title.textContent = 'UX3 Dev Inspector';
    title.style.cssText = 'font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#93c5fd;';

    const summary = document.createElement('span');
    summary.style.cssText = 'font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:6px;align-items:center;';

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.style.cssText = 'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;';

    const dockSelect = document.createElement('select');
    dockSelect.style.cssText = 'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 6px;cursor:pointer;';
    dockSelect.innerHTML = [
      '<option value="top-left">Dock TL</option>',
      '<option value="top-right">Dock TR</option>',
      '<option value="center">Dock Center</option>',
      '<option value="bottom-left">Dock BL</option>',
      '<option value="bottom-right" selected>Dock BR</option>',
    ].join('');

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.textContent = 'Expand';
    collapseBtn.style.cssText = 'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;';

    controls.append(refreshBtn, dockSelect, collapseBtn);
    header.append(title, summary, controls);

    const body = document.createElement('pre');
    body.style.cssText = 'margin:0;padding:10px;max-height:58vh;overflow:auto;white-space:pre-wrap;word-break:break-word;';

    root.append(header, body);
    document.body.appendChild(root);

    type DockTarget = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right' | 'custom';
    const MARGIN = 16;
    let dockTarget: DockTarget = 'bottom-right';
    let minimized = true;

    const setRootPosition = (left: number, top: number) => {
      root.style.left = `${Math.max(MARGIN, Math.round(left))}px`;
      root.style.top = `${Math.max(MARGIN, Math.round(top))}px`;
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    };

    const applyDock = (target: Exclude<DockTarget, 'custom'>) => {
      const rect = root.getBoundingClientRect();
      const width = Math.max(280, rect.width || 460);
      const height = Math.max(44, rect.height || 220);
      const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN);
      const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN);
      let left = maxLeft;
      let top = maxTop;

      if (target === 'top-left') {
        left = MARGIN;
        top = MARGIN;
      } else if (target === 'top-right') {
        left = maxLeft;
        top = MARGIN;
      } else if (target === 'bottom-left') {
        left = MARGIN;
        top = maxTop;
      } else if (target === 'center') {
        left = Math.max(MARGIN, (window.innerWidth - width) / 2);
        top = Math.max(MARGIN, (window.innerHeight - height) / 2);
      }

      setRootPosition(left, top);
      dockTarget = target;
      dockSelect.value = target;
    };

    const updateMinimizedVisuals = () => {
      body.style.display = minimized ? 'none' : 'block';
      collapseBtn.textContent = minimized ? 'Expand' : 'Minimize';
      root.style.opacity = minimized ? '0.5' : '1';
      root.style.maxHeight = minimized ? 'none' : '70vh';
      header.style.borderBottom = minimized ? 'none' : '1px solid #334155';
    };

    const onHoverIn = () => {
      if (minimized) {
        root.style.opacity = '0.9';
      }
    };
    const onHoverOut = () => {
      if (minimized) {
        root.style.opacity = '0.5';
      }
    };

    root.addEventListener('mouseenter', onHoverIn);
    root.addEventListener('mouseleave', onHoverOut);
    root.addEventListener('pointerenter', onHoverIn);
    root.addEventListener('pointerleave', onHoverOut);

    const gatherSnapshot = () => {
      const machines = Object.entries((appContext.machines || {}) as Record<string, any>).reduce((acc, [name, machine]) => {
        acc[name] = {
          state: machine?.getState?.(),
          context: machine?.getContext?.(),
        };
        return acc;
      }, {} as Record<string, { state: unknown; context: unknown }>);

      const devTools = (appContext.utils as any)?.devTools;
      return {
        timestamp: new Date().toISOString(),
        flags,
        routes: (appContext.nav?.routes || []).map((route: any) => ({ path: route.path, view: route.view })),
        services: Object.keys(appContext.services || {}),
        machines,
        devTools: devTools?.getSnapshot?.() ?? null,
      };
    };

    const render = () => {
      const snap = gatherSnapshot();
      const eventCount = snap.devTools?.events?.length ?? 0;
      const routeCount = Array.isArray(snap.routes) ? snap.routes.length : 0;
      const machineCount = Object.keys(snap.machines || {}).length;
      const serviceCount = Array.isArray(snap.services) ? snap.services.length : 0;
      const routeHint = typeof window !== 'undefined' ? window.location.pathname : '/';
      summary.textContent = `Route ${routeHint} | Machines ${machineCount} | Services ${serviceCount} | Routes ${routeCount} | Events ${eventCount}`;
      body.textContent = JSON.stringify(snap, null, 2);
    };

    const listeners: Array<() => void> = [];
    const devTools = (appContext.utils as any)?.devTools;
    if (devTools && typeof devTools.subscribe === 'function') {
      listeners.push(devTools.subscribe(() => render()));
    }

    for (const machine of Object.values((appContext.machines || {}) as Record<string, any>)) {
      if (machine && typeof machine.subscribe === 'function') {
        listeners.push(machine.subscribe(() => render()));
      }
    }

    const toggle = () => {
      minimized = !minimized;
      updateMinimizedVisuals();
      if (!minimized && dockTarget !== 'custom') {
        applyDock(dockTarget as Exclude<DockTarget, 'custom'>);
      }
    };

    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      setRootPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY);
    };

    const stopDragging = () => {
      dragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };

    header.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('button,select,input,textarea,a')) {
        return;
      }
      const rect = root.getBoundingClientRect();
      dragging = true;
      dockTarget = 'custom';
      dragOffsetX = event.clientX - rect.left;
      dragOffsetY = event.clientY - rect.top;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', stopDragging);
    });

    dockSelect.addEventListener('change', () => {
      applyDock(dockSelect.value as Exclude<DockTarget, 'custom'>);
    });

    refreshBtn.addEventListener('click', render);
    collapseBtn.addEventListener('click', toggle);

    const onResize = () => {
      if (dockTarget !== 'custom') {
        applyDock(dockTarget as Exclude<DockTarget, 'custom'>);
      }
    };
    window.addEventListener('resize', onResize);

    const cleanup = () => {
      listeners.forEach((dispose) => dispose());
      stopDragging();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeunload', cleanup);
    };
    window.addEventListener('beforeunload', cleanup);

    updateMinimizedVisuals();
    applyDock('bottom-right');
    render();
  };

  // auto-install dev tools plugin in dev mode unless already declared explicitly
  const pluginEntries: any[] = Array.isArray(config.plugins) ? [...config.plugins] : [];
  const shouldAutoInstallDevTools = !!(
    config.development &&
    (config.development.devTools || config.development.inspector)
  );
  if (shouldAutoInstallDevTools) {
    const exists = pluginEntries.some((entry) => {
      if (typeof entry === 'string') return entry === '@ux3/plugin-dev-tools';
      return !!entry && typeof entry === 'object' && entry.name === '@ux3/plugin-dev-tools';
    });
    if (!exists) {
      pluginEntries.unshift('@ux3/plugin-dev-tools');
    }
  }

  // auto-install plugins listed in config
  if (pluginEntries.length > 0) {
    for (const entry of pluginEntries) {
      try {
        let plugin: any = null;
        if (typeof entry === 'string') {
          // import by package name or path. if resolution fails try workspace
          // package source so tests can load local packages.
          const pkgName = entry;
          if (pkgName === '@ux3/plugin-dev-tools') {
            plugin = builtInDevToolsPlugin;
          } else {
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
          }
          plugin = plugin?.default || plugin;
        } else if (entry && entry.name) {
          // entry may specify configuration or be object
          if (entry.name === '@ux3/plugin-dev-tools') {
            plugin = builtInDevToolsPlugin;
          } else {
            try {
              const mod = await import(/* @vite-ignore */ entry.name);
              plugin = mod.default || mod;
            } catch {
              // ignore load failure
            }
          }
          // merge config onto plugin if provided
          if (plugin && entry.config) {
            plugin.config = { ...(plugin.config || {}), ...entry.config };
          }
        }
        if (plugin && context.registerPlugin) {
          await context.registerPlugin(plugin);
          recordInstalledPlugin(plugin);
        }
      } catch (err) {
        console.warn('[AppContext] failed to install plugin', entry, err);
      }
    }
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
      // ignore if we can't load (e.g. plugin not available)
    }
  }

  mountInspectorCompatibilityUI(context);

  // Emit AUTHENTICATE phase for each service
  // This phase allows services to authenticate with their backends
  if (context.hooks && context.services) {
    for (const [name, service] of Object.entries(context.services)) {
      try {
        await context.hooks.execute(ServiceLifecyclePhase.AUTHENTICATE, {
          service,
          meta: { serviceName: name },
          app: context,
          phase: ServiceLifecyclePhase.AUTHENTICATE
        });
      } catch (err) {
        console.warn(`[AppContext] AUTHENTICATE phase failed for service ${name}:`, err);
      }
    }
  }

  // Emit READY phase for each service
  // This phase signals that the service is fully initialized and ready for use
  if (context.hooks && context.services) {
    for (const [name, service] of Object.entries(context.services)) {
      try {
        await context.hooks.execute(ServiceLifecyclePhase.READY, {
          service,
          meta: { serviceName: name },
          app: context,
          phase: ServiceLifecyclePhase.READY
        });
      } catch (err) {
        console.warn(`[AppContext] READY phase failed for service ${name}:`, err);
      }
    }
  }

  // Wire client-side routing: mounts the initial view and handles history events.
  // Only runs in browser (guards against SSR / test environments without a real DOM).
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      setupNavigation(context);
    } catch (err) {
      console.warn('[AppContext] setupNavigation failed', err);
    }
  }

  // Emit READY phase to signal that app is fully initialized and interactive
  if (context.hooks) {
    try {
      await context.hooks.execute(AppLifecyclePhase.READY, {
        app: context,
        phase: AppLifecyclePhase.READY,
      });
    } catch (err) {
      console.warn('[AppContext] READY phase hook execution failed', err);
    }
  }

  return context;
}
