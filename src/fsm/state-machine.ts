/**
 * Lightweight Finite State Machine
 * ~300 LOC for core FSM engine
 */

import type { StateEvent, StateConfig, MachineConfig, InvokeConfig, AsyncStateContext } from './types.js';
import type { InvokeRegistry } from '../services/invoke-registry.js';
import { defaultLogger } from '../security/observability.js';
import { resolveDotPath, applyResultMap } from '../utils/resolve.js';

type Listener<T> = (state: string, context: T) => void;

function emitDevTools(source: string, type: string, payload?: any): void {
  if (typeof window === 'undefined') return;
  const devTools = (window as any).__ux3DevTools;
  if (devTools && typeof devTools.emit === 'function') {
    devTools.emit(source, type, { ...(payload || {}), timestamp: Date.now() });
  }
}

function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function';
}

/**
 * Helper to calculate retry delay (exponential backoff)
 */
function getRetryDelay(baseDelay: number | ((attempt: number) => number), attempt: number): number {
  if (typeof baseDelay === 'function') {
    return baseDelay(attempt);
  }
  return baseDelay * Math.pow(2, attempt);
}

/**
 * StateMachine - Core FSM engine
 */
export class StateMachine<T extends Record<string, any>> {
  private state: string;
  private context: T;
  private config: MachineConfig<T>;
  private listeners: Set<Listener<T>> = new Set();
  private eventQueue: StateEvent[] = [];
  private processing = false;
  private invokeHandlers: Map<string, (...args: any[]) => Promise<any>> = new Map();
  private actionHandlers: Map<string, (context: T, event: StateEvent) => any> = new Map();
  private invokeRegistry?: InvokeRegistry;
  private activeChildren: Map<string, string> = new Map();
  private historyMap: Map<string, string> = new Map();

  private get sc(): T & AsyncStateContext { return this.context as T & AsyncStateContext; }

  constructor(config: MachineConfig<T>, autoStart: boolean = true) {
    this.config = this.applyEntrySugar(config);
    this.state = this.config.initial;
    this.context = typeof this.config.context === 'function'
      ? this.config.context()
      : { ...(this.config.context || {} as T) };

    if (autoStart) {
      this.executeStateActions('entry', this.state);
      this.enterCompoundChildren(this.state);
    }
  }

  start(): void {
    this.executeStateActions('entry', this.state);
    this.enterCompoundChildren(this.state);
  }

  /**
   * If config.entry is set, auto-generate an entry state that invokes
   * the named source and transitions to config.initial on success.
   * Collapses the loading → invoke → success/error pattern into one line.
   */
  private applyEntrySugar(config: MachineConfig<T>): MachineConfig<T> {
    if (!config.entry) return config;

    const entryStateName = `__${config.initial}__entry`;
    const errorTarget = config.entryError || entryStateName;

    const entryState: StateConfig<T> = {
      invoke: {
        src: config.entry,
        onDone: config.initial,
      },
      on: {
        SUCCESS: config.initial,
        ERROR: errorTarget,
      },
    };

    return {
      ...config,
      initial: entryStateName,
      states: {
        [entryStateName]: entryState,
        ...config.states,
      },
    };
  }

  /**
   * Register an invoke handler (service function)
   */
  registerInvokeHandler(name: string, handler: (...args: any[]) => Promise<any>): void {
    this.invokeHandlers.set(name, handler);
  }

  /**
   * Register an action handler.
   * Actions receive (context, event) and may return void or a Partial<T> update.
   */
  registerAction(name: string, handler: (context: T, event: StateEvent) => any): void {
    this.actionHandlers.set(name, handler);
  }

  /**
   * Set the InvokeRegistry for centralized service invocation (Phase 1.2.3)
   * When set, service invokes will use the registry for retry/monitoring/stats
   */
  private crossMachineLookup: ((namespace: string) => StateMachine<any> | null) | null = null;

  // Type-safe setter for cross-machine lookup (used by FSMRegistry)
  setFSMLookup(lookup: (namespace: string) => StateMachine<any> | null): void {
    this.crossMachineLookup = lookup;
  }

  /**
   * Set the InvokeRegistry for centralized service invocation (Phase 1.2.3)
   * When set, service invokes will use the registry for retry/monitoring/stats
   */
  setInvokeRegistry(registry: InvokeRegistry): void {
    this.invokeRegistry = registry;
  }

  /**
   * Enter children of a compound state recursively
   */
  private enterCompoundChildren(stateName: string): void {
    const cfg = this.config.states[stateName];
    if (!cfg) return;
    if (cfg.type === 'atomic' || cfg.type === 'final') return;
    if (!cfg.states) return;

    let childName: string | undefined;
    if (cfg.history && this.historyMap.has(stateName)) {
      const hist = this.historyMap.get(stateName)!;
      if (cfg.states[hist]) childName = hist;
    }
    if (!childName) childName = cfg.initial;
    if (!childName || !cfg.states[childName]) return;

    this.activeChildren.set(stateName, childName);
    this.executeStateActions('entry', childName);
    this.handleStateInvoke(childName);
    this.enterCompoundChildren(childName);
  }

  /**
   * Exit children of a compound state recursively
   */
  private exitCompoundChildren(stateName: string): void {
    const cfg = this.config.states[stateName];
    if (!cfg) return;
    if (cfg.type === 'atomic' || cfg.type === 'final') return;
    const childName = this.activeChildren.get(stateName);
    if (!childName) return;

    this.exitCompoundChildren(childName);
    this.executeStateActions('exit', childName);

    if (cfg.history === 'shallow' || cfg.history === 'deep') {
      this.historyMap.set(stateName, childName);
    }
    this.activeChildren.delete(stateName);
  }

  /**
   * Get full state path from root to deepest active child
   */
  getStatePath(): string[] {
    const path = [this.state];
    let current = this.state;
    while (true) {
      const child = this.activeChildren.get(current);
      if (!child) break;
      path.push(child);
      current = child;
    }
    return path;
  }

  /**
   * Get all active leaf states (alias for getStatePath)
   */
  getActiveStates(): string[] {
    return this.getStatePath();
  }

  /**
   * Check if current state path matches a dot-separated path pattern
   * Supports prefix matching: 'edit' matches 'edit.loading'
   */
  matchesPath(path: string): boolean {
    const myPath = this.getStatePath().join('.');
    return myPath === path || myPath.startsWith(path + '.');
  }

  /**
   * Resolve transition target with support for:
   * - '.'     : self-transition (re-enter current state)
   * - '.child': relative child transition
   * - '#root' : absolute root state transition
   * - 'a.b'   : path transition (root state + child chain)
   * - 'name'  : direct root state transition
   */
  private resolveTarget(target: string): { rootState: string; childPath?: string } {
    if (target === '.') return { rootState: this.state };
    if (target.startsWith('#')) return { rootState: target.slice(1) };
    if (target.startsWith('.')) return { rootState: this.state, childPath: target.slice(1) };
    if (target.includes('.')) {
      const dotIdx = target.indexOf('.');
      return { rootState: target.substring(0, dotIdx), childPath: target.substring(dotIdx + 1) };
    }
    return { rootState: target };
  }

  /**
   * Evaluate a guard that may be a function or a string reference
   * String guard format: 'namespace:state' checks FSM 'namespace' in state 'state'
   */
  private evaluateGuard(guard: string | ((context: T, event: StateEvent) => boolean), event: StateEvent): boolean {
    if (typeof guard === 'function') return guard(this.context, event);
    if (typeof guard === 'string') {
      if (guard.includes(':')) {
        const [namespace, requiredState] = guard.split(':');
        const otherFsm = this.crossMachineLookup?.(namespace);
        if (!otherFsm) {
          defaultLogger.warn(`[fsm.guard.unresolved] Cross-machine guard "${guard}" could not resolve namespace.`, { state: this.state });
          return false;
        }
        return otherFsm.matches(requiredState) || otherFsm.matchesPath(requiredState);
      }

      const value = resolveDotPath(this.context, guard);
      if (typeof value === 'undefined' || value === null) {
        defaultLogger.warn(`[fsm.guard.unresolved] String guard "${guard}" not found in context or unresolved path.`, { state: this.state });
        return false;
      }
      return !!value;
    }
    return false;
  }

  /**
   * Handle cross-machine transitions
   * Format: target = 'namespace:state' transitions sibling FSM
   */
  private handleCrossMachineTransition(target: string): boolean {
    if (!target.includes(':')) return false;
    const [namespace, ...rest] = target.split(':');
    const stateName = rest.join(':');
    if (!namespace || !stateName) return false;
    const otherFsm = this.crossMachineLookup?.(namespace);
    if (!otherFsm) return false;
    otherFsm.transitionTo(stateName);
    return true;
  }

  /**
   * Resolve an invoke source to a handler function
   */
  private resolveInvokeHandler(src: string | ((...args: any[]) => Promise<any>)): (...args: any[]) => Promise<any> {
    if (typeof src === 'function') {
      return src;
    }
    
    const handler = this.invokeHandlers.get(src);
    if (!handler) {
      throw new Error(`No invoke handler registered for: ${src}`);
    }
    
    return handler;
  }

  /**
   * Get current state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Wait for all pending invokes and event queue to settle.
   * Returns a promise that resolves when the machine is idle (not loading, no pending events).
   */
  async waitForSettle(): Promise<void> {
    while (this.sc.loading || this.eventQueue.length > 0) {
      if (this.eventQueue.length > 0 && !this.processing) {
        this.processQueue();
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  /**
   * Get current context
   */
  getContext(): Readonly<T> {
    return Object.freeze({ ...this.context });
  }

  /**
   * Restore a persisted snapshot into the FSM before startup.
   */
  restoreSnapshot(snapshot: Record<string, any>): void {
    if (!snapshot || typeof snapshot !== 'object') return;

    const candidateState = typeof snapshot.state === 'string' && this.config.states[snapshot.state]
      ? snapshot.state
      : this.config.initial;

    this.state = candidateState;

    if (snapshot.context && typeof snapshot.context === 'object') {
      const baseContext = typeof this.config.context === 'function'
        ? this.config.context()
        : (this.config.context || {} as T);
      this.context = { ...baseContext, ...snapshot.context } as T;
    }
  }

  /**
   * Direct state transition (used for errorTarget, cross-machine, etc)
   * Performs exit/entry actions and invokes new state
   */
  transitionTo(targetState: string): void {
    if (!this.config.states[targetState]) {
      const error = new Error(`FSM transition failed: target state "${targetState}" not found`);
      defaultLogger.error('fsm.transition.failed', error, { targetState, state: this.state });
      throw error;
    }

    const prevState = this.state;

    this.exitCompoundChildren(prevState);
    this.executeStateActions('exit', prevState);

    this.state = targetState;

    this.executeStateActions('entry', this.state);
    this.enterCompoundChildren(this.state);
    this.handleStateInvoke(this.state);

    this.notifyListeners();
  }

  /**
   * Send event to state machine
   */
  send(event: StateEvent | string): void {
    const normalizedEvent: StateEvent =
      typeof event === 'string' ? { type: event } : event;

    this.eventQueue.push(normalizedEvent);

    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process event queue
   */
  private processQueue(): void {
    this.processing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      this.handleEvent(event);
    }

    this.processing = false;
  }

  /**
   * Handle single event
   */
  private handleEvent(event: StateEvent): void {
    const stateConfig = this.config.states[this.state];
    if (!stateConfig) {
      throw new Error(`[FSM ${this.config.id}] Unknown state '${this.state}'`);
    }

    // Look up transition: exact match first, then '*' catch-all wildcard
    let transition = stateConfig.on?.[event.type];
    if (!transition && stateConfig.on?.['*']) {
      transition = stateConfig.on['*'];
    }

    if (!transition) {
      const available = stateConfig.on ? Object.keys(stateConfig.on).join(', ') : '(none)';
      throw new Error(
        `[FSM ${this.config.id}] No transition for '${event.type}' in state '${this.state}'. Available: ${available}`
      );
    }

    const transitionConfig = typeof transition === 'string' ? { target: transition } : { ...transition };

    emitDevTools('fsm', event.type, { from: this.state, id: this.config.id });

    // Declarative validation: validate: true runs HTML5 Constraint Validation
    // on the source element (form or input). validate: "service:method" calls
    // the named service with the event payload + context; the service must be
    // synchronous or the developer should use a guard instead.
    if (transitionConfig.validate === true) {
      const form = event.sourceElement?.closest?.('form') as HTMLFormElement | null
        ?? event.sourceElement as HTMLFormElement | null;
      if (form && typeof form.reportValidity === 'function' && !form.reportValidity()) {
        emitDevTools('fsm', 'validate.rejected', { event: event.type, from: this.state, id: this.config.id });
        return;
      }
    }

    if (transitionConfig.guard) {
      const guardFn = this.resolveGuardFunction(transitionConfig.guard, event);
      if (!guardFn || !guardFn()) {
        emitDevTools('fsm', 'guard.rejected', { event: event.type, from: this.state, id: this.config.id });
        return;
      }
    }

    if (Array.isArray(transitionConfig.actions)) {
      transitionConfig.actions.forEach((action) => {
        const resolved = this.resolveActionFunction(action);
        if (!resolved) {
          return;
        }
        try {
          const result = resolved(this.context, event);
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            (result as Promise<any>)
              .then((update) => {
                if (update && typeof update === 'object') {
                  this.setState(update as Partial<T>);
                }
              })
              .catch((error) => {
                const ex = error instanceof Error ? error : new Error(String(error));
                defaultLogger.error('fsm.action.async.error', ex, {
                  state: this.state,
                  event: event.type,
                });
                this.send({ type: 'ERROR', payload: { error: ex } });
              });
          } else if (result && typeof result === 'object') {
            this.setState(result as Partial<T>);
          }
        } catch (e) {
          const ex = e instanceof Error ? e : new Error(String(e));
          defaultLogger.error('fsm.action.error', ex, {
            state: this.state,
            event: event.type,
          });
          this.send({ type: 'ERROR', payload: { error: ex } });
        }
      });
    }

    // Declarative context mutation: set fixed values without a TypeScript action function.
    if (transitionConfig.set && typeof transitionConfig.set === 'object') {
      const updates: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(transitionConfig.set)) {
        updates[key] = val;
      }
      this.setState(updates as Partial<T>);
    }

    // Declarative boolean toggle: flip a key in context without a TypeScript action function.
    if (typeof transitionConfig.toggle === 'string') {
      const key = transitionConfig.toggle;
      const ctx = this.context as Record<string, unknown>;
      ctx[key] = !ctx[key];
    }

    if (Array.isArray(transitionConfig.toggle)) {
      for (const key of transitionConfig.toggle) {
        if (typeof key === 'string') {
          const ctx = this.context as Record<string, unknown>;
          ctx[key] = !ctx[key];
        }
      }
    }

    // Standard declarative action: navigate to a route (client-side).
    if (typeof transitionConfig.navigate === 'string') {
      if (typeof window !== 'undefined') {
        const router = (window as any).__ux3App?.router;
        if (router && typeof router.navigate === 'function') {
          router.navigate(transitionConfig.navigate);
        } else {
          window.location.hash = transitionConfig.navigate;
        }
      }
    }

    // Standard declarative action: dispatch a DOM event.
    if (typeof transitionConfig.dispatch === 'string') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(transitionConfig.dispatch, {
          bubbles: true, composed: true,
        }));
      }
    }

    // Standard declarative action: log a diagnostic message.
    if (typeof transitionConfig.log === 'string') {
      defaultLogger.info(`[FSM ${this.config.id}] ${transitionConfig.log}`, {
        state: this.state, event: event?.type,
      });
    }

    // Scoped event bus: send an event to another FSM in the same app.
    // Format: sendTo: fsmName:eventName
    // The target FSM receives the event with the current context as payload.
    if (typeof transitionConfig.sendTo === 'string') {
      const colonIdx = transitionConfig.sendTo.indexOf(':');
      if (colonIdx > 0) {
        const targetFsm = transitionConfig.sendTo.slice(0, colonIdx);
        const targetEvent = transitionConfig.sendTo.slice(colonIdx + 1);
        const other = this.crossMachineLookup?.(targetFsm);
        if (other) {
          other.send({ type: targetEvent, payload: { ...this.context }, fromDOM: true });
        }
      }
    }

    // Auto-merge event payload into context for DOM-sourced events.
    // Every transition triggered by DOM interaction merges the element's
    // data (form fields, input values, ux-event-value) into context.
    // Opt out with `payload: false` in the transition config.
    if (event.fromDOM && transitionConfig.payload !== false && event.payload && Object.keys(event.payload).length > 0) {
      Object.assign(this.context, event.payload);
    }

    if (transitionConfig.target) {
      const resolved = this.resolveTarget(transitionConfig.target);

      // Try cross-machine transition first: 'namespace:state'
      if (this.handleCrossMachineTransition(transitionConfig.target)) {
        emitDevTools('fsm', 'cross-machine', {
          from: this.state,
          target: transitionConfig.target,
          id: this.config.id,
        });
        return;
      }

      // Handle relative child transition: '.childName'
      if (transitionConfig.target.startsWith('.')) {
        const childName = transitionConfig.target.slice(1);
        const currentChild = this.activeChildren.get(this.state);
        const rootCfg = this.config.states[this.state];
        if (rootCfg?.states?.[childName]) {
          if (currentChild) {
            this.exitCompoundChildren(this.state);
          }
          this.activeChildren.set(this.state, childName);
          this.executeStateActions('entry', childName);
          this.handleStateInvoke(childName);
          this.notifyListeners();
          emitDevTools('fsm', 'transition', {
            from: currentChild || this.state,
            to: childName,
            id: this.config.id,
          });
          return;
        }
      }

      // Handle root-level transition
      if (!this.config.states[resolved.rootState]) {
        const error = new Error(`[FSM ${this.config.id}] Transition failed: target state "${resolved.rootState}" not found in states`);
        defaultLogger.error('fsm.transition.failed', error, { target: resolved.rootState, state: this.state });
        throw error;
      }

      this.exitCompoundChildren(this.state);
      this.executeStateActions('exit', this.state);

      const prevState = this.state;
      this.state = resolved.rootState;

      this.executeStateActions('entry', this.state);
      this.enterCompoundChildren(this.state);

      // If target had a child path, navigate to it
      if (resolved.childPath) {
        const parts = resolved.childPath.split('.');
        let currentParent = this.state;
        for (const childName of parts) {
          const parentCfg = this.config.states[currentParent];
          if (parentCfg?.states?.[childName]) {
            this.activeChildren.set(currentParent, childName);
            this.executeStateActions('entry', childName);
            this.handleStateInvoke(childName);
            currentParent = childName;
          } else {
            break;
          }
        }
      }

      if (this.state !== prevState) {
        this.handleStateInvoke(this.state);
      }
      this.notifyListeners();

      emitDevTools('fsm', 'transition', {
        from: prevState,
        to: this.state,
        id: this.config.id,
      });
    }
  }

  /**
   * Resolve a guard that may be a function, string, or cross-machine check
   */
  private resolveGuardFunction(
    guard: string | ((context: T, event: StateEvent) => boolean),
    event: StateEvent
  ): (() => boolean) | null {
    if (typeof guard === 'function') {
      return () => guard(this.context, event);
    }
    if (typeof guard === 'string') {
      return () => this.evaluateGuard(guard, event);
    }
    return null;
  }

  /**
   * Resolve an action that may be a function or string.
   * String actions are resolved from actionHandlers, invokeHandlers, or window globals.
   */
  private resolveActionFunction(
    action: string | ((context: T, event: StateEvent) => any)
  ): ((context: T, event: StateEvent) => any) | null {
    if (typeof action === 'function') return action;
    if (typeof action === 'string') {
      if (this.actionHandlers.has(action)) return this.actionHandlers.get(action)!;
      if (this.invokeHandlers.has(action)) return this.invokeHandlers.get(action)!;
      if (typeof window !== 'undefined') {
        const fn = (window as any)[action];
        if (typeof fn === 'function') return fn;
      }
      emitDevTools('fsm', 'action.unresolved', { action, state: this.state, id: this.config.id });
    }
    return null;
  }

  /**
   * Handle state invoke with retry logic
   * 
   * Phase 1.2.3: Uses InvokeRegistry if available for centralized handling,
   * otherwise falls back to local handler-based logic for backwards compatibility.
   *
   * Phase 2 — auto loading/error: sets context.loading=true before invoke,
   * clears it in finally. Sets context.error on failure, clears on success.
   */
  private async handleStateInvoke(stateName: string): Promise<void> {
    const stateConfig = this.config.states[stateName];
    if (!stateConfig || !stateConfig.invoke) {
      return;
    }

    const invokeConfig = stateConfig.invoke as any;

    this.sc.loading = true;
    this.notifyListeners();

    try {
      if (this.invokeRegistry && invokeConfig.service) {
        try {
          const result = await this.invokeRegistry.executeServiceInvoke(
            { 
              service: invokeConfig.service,
              method: invokeConfig.method || 'fetch',
              input: invokeConfig.input,
              maxRetries: invokeConfig.maxRetries,
              retryDelay: invokeConfig.retryDelay
            },
            this.context
          );

          if (result.success) {
            this.sc.error = null;
            const data = applyResultMap(result.data, invokeConfig.map);
            this.setState(data as Partial<T>);
            const eventType = (data && typeof data === 'object' && (data as any).__event) ? (data as any).__event : 'SUCCESS';
            this.send({ type: eventType, payload: data });
          } else {
            throw result.error || new Error('Service invoke failed');
          }
          return;
        } catch (error) {
          const lastError = error as Error;
          this.sc.error = lastError.message || 'Unknown error';
          const errorContext: any = {
            code: (lastError as any)?.code || 'UNKNOWN_ERROR',
            message: lastError?.message || 'Unknown error',
          };

          const errorActions = stateConfig.errorActions;
          if (errorActions) {
            errorActions.forEach((action) => {
              try {
                action(this.context, lastError);
              } catch (e) {
                defaultLogger.error('fsm.errorAction.failed', e instanceof Error ? e : new Error(String(e)), {
                  state: stateName,
                  error: lastError,
                });
              }
            });
          }

          if (stateConfig.errorTarget) {
            this.transitionTo(stateConfig.errorTarget);
          } else {
            this.send({ type: 'ERROR', payload: errorContext });
          }
          return;
        }
      }

      if (invokeConfig.service && !this.invokeRegistry) {
        this.sc.loading = false;
        this.notifyListeners();
        return;
      }

    const maxRetries = invokeConfig.maxRetries ?? 0;
    const baseRetryDelay = invokeConfig.retryDelay ?? 1000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const handler = this.resolveInvokeHandler(invokeConfig.src || invokeConfig.service);
        
        const result = await handler(invokeConfig.input || invokeConfig.params, this.context);

        if (result && typeof result === 'object') {
          if (result.error) {
            throw new Error(result.error.message || 'Service error');
          }
          const mapped = applyResultMap(result, invokeConfig.map);
          this.setState(mapped as Partial<T>);
        }
        this.sc.error = null;

        const mapped = applyResultMap(result, invokeConfig.map);
        const eventType = (result && typeof result === 'object' && (result as any).__event) ? (result as any).__event : 'SUCCESS';
        this.send({ type: eventType, payload: mapped });
        return;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = getRetryDelay(baseRetryDelay, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    const errorContext: any = {
      code: (lastError as any)?.code || 'UNKNOWN_ERROR',
      message: lastError?.message || 'Unknown error',
    };
    this.sc.error = lastError?.message || 'Unknown error';

    const errorActions = stateConfig.errorActions;
    if (errorActions) {
      errorActions.forEach((action) => {
        try {
          action(this.context, lastError || new Error('Unknown error'));
        } catch (e) {
          defaultLogger.error('fsm.errorAction.failed', e instanceof Error ? e : new Error(String(e)), {
            state: stateName,
            error: lastError,
          });
        }
      });
    }

    if (stateConfig.errorTarget) {
      if (this.state === stateName) {
        this.setState({ error: errorContext } as unknown as Partial<T>);
        this.transitionTo(stateConfig.errorTarget);
      }
    } else {
      this.send({ type: 'ERROR', payload: { error: errorContext } });
    }
    } finally {
      this.sc.loading = false;
      this.notifyListeners();
    }
  }

  /**
   * Execute state actions (entry or exit)
   */
  private executeStateActions(
    actionType: 'entry' | 'exit',
    stateName: string
  ): void {
    const stateConfig = this.config.states[stateName];
    if (!stateConfig) {
      return;
    }

    const actions = actionType === 'entry' ? stateConfig.entry : stateConfig.exit;
    if (actions) {
      actions.forEach((action) => {
        try {
          const result = action(this.context);
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            (result as Promise<Partial<T>>)
              .then((update) => {
                if (update && typeof update === 'object') {
                  this.setState(update);
                }
              })
              .catch((e) => {
                defaultLogger.error('fsm.entryExitAction.failed', e instanceof Error ? e : new Error(String(e)), {
                  state: stateName,
                });
              });
          } else if (result && typeof result === 'object') {
            this.setState(result as Partial<T>);
          }
        } catch (e) {
          defaultLogger.error('fsm.entryExitAction.failed', e instanceof Error ? e : new Error(String(e)), {
            state: stateName,
          });
        }
      });
    }
  }

  /**
   * Update context
   */
  setState(updates: Partial<T>): void {
    this.context = { ...this.context, ...updates };
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state, this.context));
  }

  /**
   * Match current state against a pattern or list of patterns.
   * Useful for `ux-state` rendering or guard checks in components.
   * @param pattern single state name or array of names to compare against
   * @returns true if the current state is included in the pattern(s)
   */
  matches(pattern: string | string[]): boolean {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    const activeStates = this.getActiveStates();
    return patterns.some((p) => 
      activeStates.includes(p) || this.getStatePath().join('.') === p
    );
  }

  /**
   * Check if an event can be handled in the current state
   * @param event event to check (can be string or object)
   * @returns true if the event has a handler in current state
   */
  can(event: StateEvent | string): boolean {
    const stateConfig = this.config.states[this.state];
    if (!stateConfig || !stateConfig.on) {
      return false;
    }

    const eventType = typeof event === 'string' ? event : event.type;
    const transition = stateConfig.on[eventType];
    
    if (!transition) {
      return false;
    }

    const transitionConfig = typeof transition === 'string' ? {} : transition;
    if (transitionConfig.guard) {
      const guardFn = this.resolveGuardFunction(
        transitionConfig.guard,
        typeof event === 'string' ? { type: eventType } : event
      );
      if (!guardFn || !guardFn()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get machine configuration
   */
  getMachineConfig(): MachineConfig<T> {
    return this.config;
  }

  /**
   * Get state configuration
   */
  getStateConfig(stateName?: string): any {
    const state = stateName || this.state;
    return this.config.states[state] || {};
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.eventQueue = [];
    this.processing = false;

    this.exitCompoundChildren(this.state);
    this.executeStateActions('exit', this.state);

    this.state = this.config.initial;
    this.activeChildren.clear();

    this.executeStateActions('entry', this.state);
    this.enterCompoundChildren(this.state);

    this.notifyListeners();
  }
}
