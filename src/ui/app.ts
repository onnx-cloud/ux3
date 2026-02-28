import { StateMachine } from "src/fsm";
import type { Service } from "src/services/types";
import type { NavConfig } from "src/services/router";
import type { Widget } from "./widget";
import { WidgetFactory } from "./widget/factory";

/**
 * App Context
 * Data about the app environment passed to widgets during rendering
 */
export interface AppContext {
  styles: Record<string, string>; // normalized styles (named sets of classes)
  machines: Record<string,StateMachine<any>>;  // running FSM instances 
  services: Record<string, Service>; // registered services (e.g., API clients)
  widgets: WidgetFactory // widget factory
  ui: Record<string, Widget>; // global UI state
  template: (name: string) => string; // template registry function
  i18n: (key: string, props?: Record<string,any>) => string; // i18n function
  nav: NavConfig | null; // navigation config (routes, current path, canNavigate)
}

export interface AppContextLoader {
    load(): Promise<AppContext>;
}
