/**
 * Lightweight Finite State Machine
 * ~300 LOC for core FSM engine
 */

import type { StateEvent, StateConfig } from './types.js';

type Listener<T> = (state: string, context: T) => void;

/**
 * StateMachine - Core FSM engine
 */
export class StateMachine<T extends Record<string, any>> {
  private currentState: string;
  private context: T;
  private config: StateConfig<T>;
  private listeners: Set<Listener<T>> = new Set();
  private eventQueue: StateEvent[] = [];
  private processing = false;

  constructor(config: StateConfig<T>) {
    this.config = config;
    this.currentState = config.initial;
    this.context = typeof config.context === 'function' 
      ? config.context() 
      : { ...(config.context || {} as T) };

    // Call entry actions for initial state
    this.executeStateActions('entry', this.currentState);
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

      // Notify listeners
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
