/**
 * Lightweight Finite State Machine
 * ~300 LOC for core FSM engine
 */

import type { StateEvent, StateConfig, MachineConfig, InvokeConfig } from './types.js';

type Listener<T> = (state: string, context: T) => void;

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
  private currentState: string;
  private context: T;
  private config: MachineConfig<T>;
  private listeners: Set<Listener<T>> = new Set();
  private eventQueue: StateEvent[] = [];
  private processing = false;
  private invokeHandlers: Map<string, (...args: any[]) => Promise<any>> = new Map();
  private invokeRegistry?: any; // InvokeRegistry - weak ref to avoid circular deps

  constructor(config: MachineConfig<T>) {
    this.config = config;
    this.currentState = config.initial;
    this.context = typeof config.context === 'function' 
      ? config.context() 
      : { ...(config.context || {} as T) };

    // Call entry actions for initial state
    this.executeStateActions('entry', this.currentState);
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
  setInvokeRegistry(registry: any): void {
    this.invokeRegistry = registry;
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
    return this.currentState;
  }

  /**
   * Get current context
   */
  getContext(): Readonly<T> {
    return Object.freeze({ ...this.context });
  }

  /**
   * Direct state transition (used for errorTarget, etc)
   * Performs exit/entry actions and invokes new state
   */
  private transitionTo(targetState: string): void {
    if (!this.config.states[targetState]) {
      console.error(`[FSM] Target state "${targetState}" not found`);
      return;
    }

    const prevState = this.currentState;

    // Execute exit actions
    this.executeStateActions('exit', prevState);

    // Update state
    this.currentState = targetState;

    // Execute entry actions
    this.executeStateActions('entry', this.currentState);

    // Start invoke for new state (if configured)
    this.handleStateInvoke(this.currentState);

    // Notify listeners
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
    const stateConfig = this.config.states[this.currentState];
    if (!stateConfig || !stateConfig.on) {
      return;
    }

    const transition = stateConfig.on[event.type];
    if (!transition) {
      return;
    }

    const transitionConfig = typeof transition === 'string' ? { target: transition } : transition;

    // Check guard condition
    if (transitionConfig.guard && !transitionConfig.guard(this.context)) {
      return;
    }

    // Execute transition actions; allow functions to return partial context updates
    if (transitionConfig.actions) {
      transitionConfig.actions.forEach((action) => {
        try {
          const result = action(this.context, event);
          if (result && typeof result === 'object') {
            // merge returned context updates
            this.setState(result as Partial<T>);
          } else if (result && typeof result.then === 'function') {
            // async result
            (result as Promise<any>)
              .then((update) => {
                if (update && typeof update === 'object') {
                  this.setState(update as Partial<T>);
                }
              })
              .catch(() => {
                /* swallow */
              });
          }
        } catch (e) {
          console.error('[StateMachine] action error', e);
        }
      });
    }

    // Transition to new state if target exists
    if (transitionConfig.target) {
      const prevState = this.currentState;

      // Execute exit actions
      this.executeStateActions('exit', prevState);

      // Update state
      this.currentState = transitionConfig.target;

      // Execute entry actions
      this.executeStateActions('entry', this.currentState);

      // Start invoke for new state (if configured)
      this.handleStateInvoke(this.currentState);

      // Notify listeners
      this.notifyListeners();
    }
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
              console.error('[FSM] errorAction threw:', e);
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
          console.error('[StateMachine] errorAction error', e);
        }
      });
    }

    // Transition to errorTarget if configured
    if (stateConfig.errorTarget) {
      const prevState = this.currentState;
      
      // Ensure we only transition if still in the same state
      if (this.currentState === stateName) {
        this.setState({ error: errorContext } as Partial<T>);
        
        // Execute exit actions
        this.executeStateActions('exit', prevState);

        // Update state
        this.currentState = stateConfig.errorTarget;

        // Execute entry actions
        this.executeStateActions('entry', this.currentState);

        // Notify listeners
        this.notifyListeners();
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
          if (result && typeof result === 'object') {
            this.setState(result as Partial<T>);
          }
        } catch (e) {
          console.error('[StateMachine] entry/exit action error', e);
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
    this.listeners.forEach((listener) => listener(this.currentState, this.context));
  }

  /**
   * Match current state against a pattern or list of patterns.
   * Useful for `ux-state` rendering or guard checks in components.
   * @param pattern single state name or array of names to compare against
   * @returns true if the current state is included in the pattern(s)
   */
  matches(pattern: string | string[]): boolean {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    return patterns.includes(this.currentState);
  }

  /**
   * Check if an event can be handled in the current state
   * @param event event to check (can be string or object)
   * @returns true if the event has a handler in current state
   */
  can(event: StateEvent | string): boolean {
    const stateConfig = this.config.states[this.currentState];
    if (!stateConfig || !stateConfig.on) {
      return false;
    }

    const eventType = typeof event === 'string' ? event : event.type;
    const transition = stateConfig.on[eventType];
    
    if (!transition) {
      return false;
    }

    // Check guard condition if present
    const transitionConfig = typeof transition === 'string' ? {} : transition;
    if (transitionConfig.guard && !transitionConfig.guard(this.context)) {
      return false;
    }

    return true;
  }

  /**
   * Get machine configuration
   */
  getMachineConfig(): StateConfig<T> {
    return this.config;
  }

  /**
   * Get state configuration
   */
  getStateConfig(stateName?: string): any {
    const state = stateName || this.currentState;
    return this.config.states[state] || {};
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.eventQueue = [];
    this.processing = false;

    // Execute exit actions for current state
    this.executeStateActions('exit', this.currentState);

    this.currentState = this.config.initial;

    // Execute entry actions for initial state
    this.executeStateActions('entry', this.currentState);

    // Notify listeners
    this.notifyListeners();
  }
}
