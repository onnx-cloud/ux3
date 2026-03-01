/**
 * AppContextBuilder - Dependency Injection Container
 * Wires generated configuration into a live AppContext
 */

import { StateMachine } from '../fsm/state-machine.js';
import type { StateConfig } from '../fsm/types.js';
import { HttpService } from '../services/http.js';
import { WebSocketService } from '../services/websocket.js';
import { JSONRPCService } from '../services/jsonrpc.js';
import { Router } from '../services/router.js';
import type { Service, ServiceConfig } from '../services/types.js';
import type { NavConfig } from '../services/router.js';
import { WidgetFactory } from './widget/factory.js';
import type { AppContext } from './app.js';
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

        // Subscribe to state changes for telemetry
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
      if (!this.machines || this.machines.size === 0) {
        throw new Error('Machines must be built before router (call withMachines first)');
      }

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

/**
 * Quick helper to build AppContext from generated config
 */
export async function createAppContext(
  config: GeneratedConfig
): Promise<AppContext> {
  return new AppContextBuilder(config)
    .withMachines()
    .withServices()
    .withWidgets()
    .withI18n()
    .withTemplates()
    .withStyles()
    .build();
}
