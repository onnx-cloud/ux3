/**
 * Lightweight Finite State Machine
 * ~300 LOC for core FSM engine
 */

import type { StateEvent, StateConfig, MachineConfig, InvokeConfig } from './types.js';
import type { InvokeRegistry } from '../services/invoke-registry.js';
import { defaultLogger } from '../security/observability.js';

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
  private invokeRegistry?: InvokeRegistry;
  private activeChildren: Map<string, string> = new Map();
  private historyMap: Map<string, string> = new Map();

  constructor(config: MachineConfig<T>) {
    this.config = config;
    this.state = config.initial;
    this.context = typeof config.context === 'function' 
      ? config.context() 
      : { ...(config.context || {} as T) };

    this.executeStateActions('entry', this.state);
    this.enterCompoundChildren(this.state);
  }

  /**
   * Register an invoke handler (service function)
   */
  registerInvokeHandler(name: string, handler: (...args: any[]) => Promise<any>): void {
    this.invokeHandlers.set(name, handler);
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
  private evaluateGuard(guard: string | ((context: T) => boolean)): boolean {
    if (typeof guard === 'function') return guard(this.context);
    if (typeof guard === 'string') {
      if (guard.includes(':')) {
        const [namespace, requiredState] = guard.split(':');
        const otherFsm = this.crossMachineLookup?.(namespace);
        if (!otherFsm) return false;
        return otherFsm.matches(requiredState) || otherFsm.matchesPath(requiredState);
      }
      if (guard in this.context) {
        return !!this.context[guard];
      }
      defaultLogger.warn('fsm.guard.unresolved', `String guard "${guard}" not found in context.`, { state: this.state });
      return true;
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
   * Get current context
   */
  getContext(): Readonly<T> {
    return Object.freeze({ ...this.context });
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
    if (!stateConfig || !stateConfig.on) {
      return;
    }

    const transition = stateConfig.on[event.type];
    if (!transition) {
      if (this.config.strict) {
        const available = Object.keys(stateConfig.on).join(', ');
        throw new Error(`[FSM ${this.config.id}] No transition for '${event.type}' in state '${this.state}'. Available: ${available || '(none)'}`);
      }
      return;
    }

    const transitionConfig = typeof transition === 'string' ? { target: transition } : { ...transition };

    emitDevTools('fsm', event.type, { from: this.state, id: this.config.id });

    if (transitionConfig.guard) {
      const guardFn = this.resolveGuardFunction(transitionConfig.guard);
      if (guardFn && !guardFn()) {
        emitDevTools('fsm', 'guard.rejected', { event: event.type, from: this.state, id: this.config.id });
        return;
      }
    }

    if (Array.isArray(transitionConfig.actions)) {
      transitionConfig.actions.forEach((action) => {
        if (!isFunction(action)) {
          return;
        }
        try {
          const result = action(this.context, event);
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
      const current = (this.context as any)[key];
      (this.context as any)[key] = !current;
    }

    // Declarative boolean toggles (array form): flip multiple keys.
    if (Array.isArray(transitionConfig.toggle)) {
      for (const key of transitionConfig.toggle) {
        if (typeof key === 'string') {
          (this.context as any)[key] = !((this.context as any)[key]);
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
    guard: string | ((context: T) => boolean)
  ): (() => boolean) | null {
    if (typeof guard === 'function') {
      return () => guard(this.context);
    }
    if (typeof guard === 'string') {
      if (guard.includes(':')) {
        const [namespace, requiredState] = guard.split(':');
        return () => {
          const other = this.crossMachineLookup?.(namespace);
          if (!other) return false;
          return other.matches(requiredState) || other.matchesPath(requiredState);
        };
      }
      if (guard in this.context) {
        return () => !!this.context[guard];
      }
      defaultLogger.warn('fsm.guard.unresolved', `String guard "${guard}" not found in context — allowing transition.`, { state: this.state });
      return null;
    }
    return null;
  }

  /**
   * Handle state invoke with retry logic
   * 
   * Phase 1.2.3: Uses InvokeRegistry if available for centralized handling,
   * otherwise falls back to local handler-based logic for backwards compatibility.
   */
  private async handleStateInvoke(stateName: string): Promise<void> {
    const stateConfig = this.config.states[stateName];
    if (!stateConfig || !stateConfig.invoke) {
      return;
    }

    const invokeConfig = stateConfig.invoke as any;

    // Phase 1.2.3: Try to use InvokeRegistry for service invokes
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
          // Handle result
          if (result.data && typeof result.data === 'object') {
            this.setState(result.data as Partial<T>);
          }
          // Success - send SUCCESS event
          this.send({ type: 'SUCCESS', payload: result.data });
        } else {
          // Invoke failed
          throw result.error || new Error('Service invoke failed');
        }
        return;
      } catch (error) {
        // Fall through to error handling below
        const lastError = error as Error;
        const errorContext: any = {
          code: (lastError as any)?.code || 'UNKNOWN_ERROR',
          message: lastError?.message || 'Unknown error',
        };

        // Execute errorActions if configured
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

        // Transition to error state if configured
        if (stateConfig.errorTarget) {
          // Direct state transition to errorTarget (not via event)
          this.transitionTo(stateConfig.errorTarget);
        } else {
          // Send generic ERROR event
          this.send({ type: 'ERROR', payload: errorContext });
        }
        return;
      }
    }

    // Fallback: Use local handler-based logic (Phase 1.1 behavior)
    const maxRetries = invokeConfig.maxRetries ?? 0;
    const baseRetryDelay = invokeConfig.retryDelay ?? 1000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Resolve the invoke source
        const handler = this.resolveInvokeHandler(invokeConfig.src || invokeConfig.service);
        
        // Call the handler with input and context
        const result = await handler(invokeConfig.input || invokeConfig.params, this.context);

        // Handle result
        if (result && typeof result === 'object') {
          if (result.error) {
            // Error object returned from service
            throw new Error(result.error.message || 'Service error');
          }
          // Update context with result
          this.setState(result as Partial<T>);
        }

        // Success - send SUCCESS event
        this.send({ type: 'SUCCESS', payload: result });
        return;
      } catch (error) {
        lastError = error as Error;

        // If this is not the last attempt, wait and retry
        if (attempt < maxRetries) {
          const delay = getRetryDelay(baseRetryDelay, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries exhausted - handle error
    const errorContext: any = {
      code: (lastError as any)?.code || 'UNKNOWN_ERROR',
      message: lastError?.message || 'Unknown error',
    };

    // Execute errorActions if configured
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

    // Transition to errorTarget if configured
    if (stateConfig.errorTarget) {
      if (this.state === stateName) {
        this.setState({ error: errorContext } as unknown as Partial<T>);
        this.transitionTo(stateConfig.errorTarget);
      }
    } else {
      // No errorTarget - send ERROR event to let views handle it
      this.send({ type: 'ERROR', payload: { error: errorContext } });
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
      const guardFn = this.resolveGuardFunction(transitionConfig.guard);
      if (guardFn && !guardFn()) {
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
