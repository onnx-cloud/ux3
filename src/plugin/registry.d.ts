import type { AppContext } from "../ui/app";
import type { Hook } from "../core/lifecycle";
type PluginHooks = {
    app?: Partial<Record<string, Hook[]>>;
    component?: Partial<Record<string, Hook[]>>;
    service?: Partial<Record<string, Hook[]>>;
};
export interface ComponentFactory {
    (...args: any[]): any;
}
export interface ServiceFactory {
    (...args: any[]): any;
}
export interface DirectiveFactory {
    (...args: any[]): any;
}
export interface Plugin {
    name: string;
    version: string;
    /** Human-readable description for CLI and inspector */
    description?: string;
    /** Semver range of @ux3/ux3 this plugin supports */
    ux3PeerVersion?: string;
    /** Names of other plugins that must be registered first */
    dependencies?: string[];
    install?(app: AppContext): void | Promise<void>;
    uninstall?(app: AppContext): void | Promise<void>;
    hooks?: PluginHooks;
    components?: Record<string, ComponentFactory>;
    services?: Record<string, ServiceFactory>;
    directives?: Record<string, DirectiveFactory>;
    utils?: Record<string, Function>;
}
export declare class PluginRegistry {
    private plugins;
    /**
     * Register a plugin.
     * @param plugin  The plugin to register.
     * @param force   When true, allow overwriting an already-registered plugin
     *                (useful for hot-reload in dev mode).
     */
    register(plugin: Plugin, force?: boolean): void;
    load(name: string): Plugin | null;
    list(): Plugin[];
    has(name: string): boolean;
    clear(): void;
}
export {};
