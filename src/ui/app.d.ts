import { StateMachine } from "../fsm/index.js";
import type { Service } from "../services/types.js";
import type { NavConfig } from "../services/router.js";
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
    styles: Record<string, string>;
    machines: Record<string, StateMachine<C>>;
    services: Record<string, Service>;
    browser: BrowserContext;
    widgets: WidgetFactory;
    ui: Record<string, HTMLElement>;
    template: (name: string) => string;
    render: (template: string, props?: Record<string, unknown>) => string;
    i18n: (key: string, props?: Record<string, unknown>) => string;
    nav: NavConfig | null;
    hooks?: HookRegistry;
    invokeRegistry?: import('../services/invoke-registry.js').InvokeRegistry;
    _invokeRegistry?: import('../services/invoke-registry.js').InvokeRegistry;
    registerAsset?: (asset: AssetDescriptor) => void;
    registerService?: (name: string, factory: ServiceFactory) => void;
    registerComponent?: (name: string, factory: ComponentFactory) => void;
    registerView?: (name: string, template: string) => void;
    registerRoute?: (path: string, viewName: string, label?: string, parent?: string) => void;
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
    config?: any;
}
export interface AppContextLoader {
    load(): Promise<AppContext>;
}
