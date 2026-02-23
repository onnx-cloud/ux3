import { StateMachine } from "src/fsm";
import { Service } from "src/services";
import { Widget, WidgetFactory } from "./widget";

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
}

export interface AppContextLoader {
    load(): Promise<AppContext>;
}
