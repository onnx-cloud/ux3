import { StateMachine } from "../fsm/index.js";
import type { Service } from "../services/types.js";
import type { NavConfig } from "../services/router.js";
import type { Widget } from "./widget/index.js";
import { WidgetFactory } from "./widget/factory.js";
import type { HookRegistry } from "../core/lifecycle.js";
import type { ServiceFactory, ComponentFactory } from "../plugin/registry.js";
import type { BrowserContext } from './browser-context.js';

/**
 * App Context
 * Data about the app environment passed to widgets during rendering
 */
export interface AssetDescriptor {
  type: 'script' | 'style';
  src?: string;
  href?: string;
  async?: boolean;
  defer?: boolean;
}

export interface AppContext<C extends Record<string, unknown> = Record<string, unknown>> {
  styles: Record<string, string>; // normalized styles (named sets of classes)
  machines: Record<string, StateMachine<C>>; // running FSM instances
  services: Record<string, Service>; // registered services (e.g., API clients)
  browser: BrowserContext; // normalized browser runtime context
  widgets: WidgetFactory; // widget factory
  ui: Record<string, Widget>; // global UI state
  template: (name: string) => string; // template registry function
  render: (template: string, props?: Record<string, unknown>) => string; // template rendering function
  i18n: (key: string, props?: Record<string, unknown>) => string; // i18n function
  nav: NavConfig | null; // navigation config (routes, current path, canNavigate)
  hooks?: HookRegistry; // lifecycle hooks for plugins
  invokeRegistry?: import('../services/invoke-registry.js').InvokeRegistry; // service invocation registry
  _invokeRegistry?: import('../services/invoke-registry.js').InvokeRegistry; // internal lazy-loaded registry

  // helpers for plugins or runtime code
  registerAsset?: (asset: AssetDescriptor) => void;
  registerService?: (name: string, factory: ServiceFactory) => void;
  registerComponent?: (name: string, factory: ComponentFactory) => void;
  registerView?: (name: string, template: string) => void;
  registerRoute?: (path: string, viewName: string) => void;
  registerMachine?: (namespace: string, fsm: StateMachine<C>) => void;
  /**
   * Convenience for programmatically installing another plugin at runtime.
   * The plugin's `install` method is invoked with this context.
   */
  registerPlugin?: (plugin: import('../plugin/registry').Plugin) => void;

  /** Structured logger attached by SpaCore or available to plugins. */
  logger?: import('../logger/logger.js').StructuredLogger;

  /** Arbitrary utils namespace used by plugins (e.g. tailwind-plus). */
  utils?: Record<string, Function>;

  // full generated configuration (useful for plugins)
  config?: any;
}

export interface AppContextLoader {
    load(): Promise<AppContext>;
}
