/**
 * App Root FSM
 *
 * Models the app lifecycle as first-class FSM states so the framework's
 * own boot, connect, authenticate, route, and ready phases are visible
 * in the same inspection/event model as widgets and services.
 *
 * Replaces the imperative orchestration in createAppContext with explicit
 * state transitions that emit events and drive lifecycle hooks.
 */

import { StateMachine } from '../fsm/state-machine.js';
import type { MachineConfig, StateConfig } from '../fsm/types.js';
import { AppLifecyclePhase, ServiceLifecyclePhase } from '../core/lifecycle.js';
import { defaultLogger } from '../security/observability.js';
import type { AppContext } from './app.js';

export type AppFSMState =
  | 'boot'
  | 'config'
  | 'build'
  | 'hydrate'
  | 'ready'
  | 'error';

export interface AppFSMContext {
  app: AppContext | null;
  phase: AppFSMState;
  error: Error | null;
  servicesConnected: boolean;
  servicesAuthenticated: boolean;
  routingWired: boolean;
}

/**
 * Notify devtools of the current app lifecycle phase.
 */
function emitDevToolsEvent(app: AppContext | null, state: AppFSMState, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const devTools = (window as any).__ux3DevTools;
  if (!devTools || typeof devTools.emit !== 'function') return;
  devTools.emit('system', `app.lifecycle.${state}`, {
    state,
    timestamp: Date.now(),
    ...(data || {}),
  });
}

/**
 * Run service lifecycle hooks for the given phase across all registered services.
 */
async function runServicePhase(
  app: AppContext | null,
  phase: ServiceLifecyclePhase
): Promise<void> {
  if (!app?.hooks || !app?.services) return;
  for (const [name, service] of Object.entries(app.services)) {
    try {
      await app.hooks.execute(phase, {
        service,
        meta: { serviceName: name },
        app: app as any,
        phase,
      });
    } catch (err) {
      defaultLogger.warn(
        `[AppFSM] ${phase} hook failed for service ${name}`,
        { error: String(err) }
      );
    }
  }
}

type Action = (ctx: AppFSMContext) => void | Partial<AppFSMContext> | Promise<Partial<AppFSMContext>>;

const states: Record<AppFSMState, StateConfig<AppFSMContext>> = {
  boot: {
    entry: [
      ((ctx: AppFSMContext) => {
        emitDevToolsEvent(ctx.app, 'boot', { phase: 'boot' });
      }) as Action,
    ],
    on: {
      CONFIG_READY: 'config',
      ERROR: 'error',
    },
  },

  config: {
    entry: [
      ((ctx: AppFSMContext) => {
        ctx.phase = 'config';
        emitDevToolsEvent(ctx.app, 'config');
      }) as Action,
    ],
    on: {
      BUILD_COMPLETE: 'build',
      ERROR: 'error',
    },
  },

  build: {
    entry: [
      (async (ctx: AppFSMContext) => {
        ctx.phase = 'build';
        emitDevToolsEvent(ctx.app, 'build');
        await runServicePhase(ctx.app, ServiceLifecyclePhase.CONNECT);
        ctx.servicesConnected = true;
      }) as Action,
    ],
    on: {
      SERVICES_CONNECTED: 'hydrate',
      ERROR: 'error',
    },
  },

  hydrate: {
    entry: [
      (async (ctx: AppFSMContext) => {
        ctx.phase = 'hydrate';
        emitDevToolsEvent(ctx.app, 'hydrate', {
          servicesConnected: ctx.servicesConnected,
        });
        await runServicePhase(ctx.app, ServiceLifecyclePhase.AUTHENTICATE);
        ctx.servicesAuthenticated = true;
        await runServicePhase(ctx.app, ServiceLifecyclePhase.READY);
      }) as Action,
    ],
    on: {
      ROUTING_READY: 'ready',
      ERROR: 'error',
    },
  },

  ready: {
    entry: [
      (async (ctx: AppFSMContext) => {
        ctx.phase = 'ready';
        ctx.routingWired = true;
        emitDevToolsEvent(ctx.app, 'ready', {
          servicesConnected: ctx.servicesConnected,
          servicesAuthenticated: ctx.servicesAuthenticated,
          routingWired: ctx.routingWired,
        });

        // Emit app-level READY hook
        if (ctx.app?.hooks) {
          try {
            await ctx.app.hooks.execute(AppLifecyclePhase.READY, {
              app: ctx.app as any,
              phase: AppLifecyclePhase.READY,
            });
          } catch (err) {
            defaultLogger.warn('[AppFSM] READY hook failed', { error: String(err) });
          }
        }

        // Dispatch global ready event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ux3:ready', { detail: { app: ctx.app } })
          );
        }
      }) as Action,
    ],
  },

  error: {
    entry: [
      ((ctx: AppFSMContext) => {
        ctx.phase = 'error';
        const err = ctx.error || new Error('Unknown app lifecycle error');
        defaultLogger.error('[AppFSM] App lifecycle error', err, {
          phase: ctx.phase,
          servicesConnected: ctx.servicesConnected,
          servicesAuthenticated: ctx.servicesAuthenticated,
        });
        emitDevToolsEvent(ctx.app, 'error', {
          error: err.message,
          phase: ctx.phase,
        });
      }) as Action,
    ],
  },
};

const appFSMConfig: MachineConfig<AppFSMContext> = {
  id: 'ux3-app',
  initial: 'boot',
  context: (): AppFSMContext => ({
    app: null,
    phase: 'boot',
    error: null,
    servicesConnected: false,
    servicesAuthenticated: false,
    routingWired: false,
  }),
  states,
};

/**
 * Create the App Root FSM and immediately start it in the `boot` state.
 */
export function createAppFSM(): StateMachine<AppFSMContext> {
  return new StateMachine(appFSMConfig);
}

/**
 * Transition the app FSM to the next lifecycle phase.
 */
export function transitionAppFSM(
  fsm: StateMachine<AppFSMContext>,
  event: string,
  app?: AppContext,
  error?: Error
): void {
  if (app && !fsm.getContext().app) {
    const ctx = fsm.getContext();
    ctx.app = app;
  }
  if (error) {
    const ctx = fsm.getContext();
    ctx.error = error;
  }
  fsm.sendEvent({ type: event });
}

/**
 * Flag the app FSM with an error and transition to the error state.
 */
export function failAppFSM(
  fsm: StateMachine<AppFSMContext>,
  error: Error,
  app?: AppContext
): void {
  transitionAppFSM(fsm, 'ERROR', app, error);
}

export { appFSMConfig };
