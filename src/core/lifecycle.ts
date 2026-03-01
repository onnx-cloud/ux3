import type { AppContext } from "./../ui/app";

// -----------------------------------------------------------------------------
// Lifecycle phase enums
// -----------------------------------------------------------------------------

export enum AppLifecyclePhase {
  INIT = 'ux3.app.phase.init',           // Plugins loaded, config ready
  CONFIG = 'ux3.app.phase.config',       // Config applied
  BUILD = 'ux3.app.phase.build',         // FSMs, services registered
  HYDRATE = 'ux3.app.phase.hydrate',     // SSR state recovered
  READY = 'ux3.app.phase.ready',         // App interactive
  DESTROY = 'ux3.app.phase.destroy'      // Cleanup, shutdown
}

export enum ComponentLifecyclePhase {
  CREATE = 'ux3.component.phase.create',   // Constructor
  MOUNT = 'ux3.component.phase.mount',     // DOM attached
  RENDER = 'ux3.component.phase.render',   // Initial render
  UPDATE = 'ux3.component.phase.update',   // State changed
  UNMOUNT = 'ux3.component.phase.unmount', // DOM removed
  DESTROY = 'ux3.component.phase.destroy'  // Cleanup
}

export enum ServiceLifecyclePhase {
  REGISTER = 'ux3.service.phase.register',         // Service registered
  CONNECT = 'ux3.service.phase.connect',           // Network connection
  AUTHENTICATE = 'ux3.service.phase.authenticate', // Auth established
  READY = 'ux3.service.phase.ready',               // Ready for use
  ERROR = 'ux3.service.phase.error',               // Error occurred
  RECONNECT = 'ux3.service.phase.reconnect',       // Reconnecting
  DISCONNECT = 'ux3.service.phase.disconnect'      // Disconnected
}

// -----------------------------------------------------------------------------
// Hook types & registry
// -----------------------------------------------------------------------------

export interface HookContext {
  app?: AppContext;
  component?: any;   // use any for now until view component type stabilized
  service?: any;     // similar placeholder
  phase: string;
  meta?: Record<string, any>;
}

export type Hook = (context: HookContext) => Promise<void> | void;

/**
 * Simple registry mapping phase names to arrays of hooks.
 * Hooks are executed in registration order.  Async handlers are awaited.
 */
export class HookRegistry {
  private hooks = new Map<string, Hook[]>();

  /**
   * Register a hook for the given phase.
   */
  on(phase: string, handler: Hook): void {
    const arr = this.hooks.get(phase) || [];
    arr.push(handler);
    this.hooks.set(phase, arr);
  }

  /**
   * Unregister a previously registered handler.
   */
  off(phase: string, handler: Hook): void {
    const arr = this.hooks.get(phase);
    if (!arr) return;
    const idx = arr.indexOf(handler);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) this.hooks.delete(phase);
  }

  /**
   * Remove all hooks for a phase, or clear entire registry if no phase specified.
   */
  clear(phase?: string): void {
    if (phase) {
      this.hooks.delete(phase);
    } else {
      this.hooks.clear();
    }
  }

  /**
   * Execute all hooks for a phase, passing a context object.  Promises are awaited sequentially.
   */
  async execute(phase: string, context: HookContext): Promise<void> {
    const arr = this.hooks.get(phase);
    if (!arr || arr.length === 0) return;
    // shallow copy in case hooks mutate registry during execution
    for (const h of [...arr]) {
      await h({ ...context, phase });
    }
  }
}
