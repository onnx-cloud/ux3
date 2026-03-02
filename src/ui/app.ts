import { StateMachine } from "src/fsm";
import type { Service } from "src/services/types";
import type { NavConfig } from "src/services/router";
import type { Widget } from "./widget";
import { WidgetFactory } from "./widget/factory";

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

export interface AppContext {
  styles: Record<string, string>; // normalized styles (named sets of classes)
  machines: Record<string,StateMachine<any>>;  // running FSM instances 
  services: Record<string, Service>; // registered services (e.g., API clients)
  widgets: WidgetFactory // widget factory
  ui: Record<string, Widget>; // global UI state
  template: (name: string) => string; // template registry function
  i18n: (key: string, props?: Record<string,any>) => string; // i18n function
  nav: NavConfig | null; // navigation config (routes, current path, canNavigate)

  // helpers for plugins or runtime code
  registerAsset?: (asset: AssetDescriptor) => void;
  registerService?: (name: string, factory: ServiceFactory) => void;
  registerComponent?: (name: string, factory: ComponentFactory) => void;
  registerView?: (name: string, template: string) => void;
  registerRoute?: (path: string, viewName: string) => void;
  registerMachine?: (namespace: string, fsm: StateMachine<any>) => void;
  /**
   * Convenience for programmatically installing another plugin at runtime.
   * The plugin's `install` method is invoked with this context.
   */
  registerPlugin?: (plugin: import('../plugin/registry').Plugin) => void;

  // full generated configuration (useful for plugins)
  config?: any;
}

export interface AppContextLoader {
    load(): Promise<AppContext>;
}
