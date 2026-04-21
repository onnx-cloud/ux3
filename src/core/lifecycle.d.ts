import type { AppContext } from "./../ui/app";
export declare enum AppLifecyclePhase {
    INIT = "ux3.app.phase.init",// Plugins loaded, config ready
    CONFIG = "ux3.app.phase.config",// Config applied
    BUILD = "ux3.app.phase.build",// FSMs, services registered
    HYDRATE = "ux3.app.phase.hydrate",// SSR state recovered
    READY = "ux3.app.phase.ready",// App interactive
    DESTROY = "ux3.app.phase.destroy"
}
export declare enum ComponentLifecyclePhase {
    CREATE = "ux3.component.phase.create",// Constructor
    MOUNT = "ux3.component.phase.mount",// DOM attached
    RENDER = "ux3.component.phase.render",// Initial render
    UPDATE = "ux3.component.phase.update",// State changed
    UNMOUNT = "ux3.component.phase.unmount",// DOM removed
    DESTROY = "ux3.component.phase.destroy"
}
export declare enum ServiceLifecyclePhase {
    REGISTER = "ux3.service.phase.register",// Service registered
    CONNECT = "ux3.service.phase.connect",// Network connection
    AUTHENTICATE = "ux3.service.phase.authenticate",// Auth established
    READY = "ux3.service.phase.ready",// Ready for use
    ERROR = "ux3.service.phase.error",// Error occurred
    RECONNECT = "ux3.service.phase.reconnect",// Reconnecting
    DISCONNECT = "ux3.service.phase.disconnect"
}
export interface HookContext {
    app?: AppContext;
    component?: any;
    service?: any;
    phase: string;
    meta?: Record<string, any>;
}
export type Hook = (context: HookContext) => Promise<void> | void;
/**
 * Simple registry mapping phase names to arrays of hooks.
 * Hooks are executed in registration order.  Async handlers are awaited.
 */
export declare class HookRegistry {
    private hooks;
    /**
     * Register a hook for the given phase.
     */
    on(phase: string, handler: Hook): void;
    /**
     * Unregister a previously registered handler.
     */
    off(phase: string, handler: Hook): void;
    /**
     * Remove all hooks for a phase, or clear entire registry if no phase specified.
     */
    clear(phase?: string): void;
    /**
     * Execute all hooks for a phase, passing a context object.  Promises are awaited sequentially.
     */
    execute(phase: string, context: HookContext): Promise<void>;
}
