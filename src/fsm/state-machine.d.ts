/**
 * Lightweight Finite State Machine
 * ~300 LOC for core FSM engine
 */
import type { StateEvent, MachineConfig } from './types.js';
import type { InvokeRegistry } from '../services/invoke-registry.js';
type Listener<T> = (state: string, context: T) => void;
/**
 * StateMachine - Core FSM engine
 */
export declare class StateMachine<T extends Record<string, any>> {
    private currentState;
    private context;
    private config;
    private listeners;
    private eventQueue;
    private processing;
    private invokeHandlers;
    private invokeRegistry?;
    constructor(config: MachineConfig<T>);
    /**
     * Register an invoke handler (service function)
     */
    registerInvokeHandler(name: string, handler: (...args: any[]) => Promise<any>): void;
    /**
     * Set the InvokeRegistry for centralized service invocation (Phase 1.2.3)
     * When set, service invokes will use the registry for retry/monitoring/stats
     */
    setInvokeRegistry(registry: InvokeRegistry): void;
    /**
     * Resolve an invoke source to a handler function
     */
    private resolveInvokeHandler;
    /**
     * Get current state
     */
    getState(): string;
    /**
     * Get current context
     */
    getContext(): Readonly<T>;
    /**
     * Direct state transition (used for errorTarget, etc)
     * Performs exit/entry actions and invokes new state
     */
    private transitionTo;
    /**
     * Send event to state machine
     */
    send(event: StateEvent | string): void;
    /**
     * Process event queue
     */
    private processQueue;
    /**
     * Handle single event
     */
    private handleEvent;
    /**
     * Handle state invoke with retry logic
     *
     * Phase 1.2.3: Uses InvokeRegistry if available for centralized handling,
     * otherwise falls back to local handler-based logic for backwards compatibility.
     */
    private handleStateInvoke;
    /**
     * Execute state actions (entry or exit)
     */
    private executeStateActions;
    /**
     * Update context
     */
    setState(updates: Partial<T>): void;
    /**
     * Subscribe to state changes
     */
    subscribe(listener: Listener<T>): () => void;
    /**
     * Notify all listeners
     */
    private notifyListeners;
    /**
     * Match current state against a pattern or list of patterns.
     * Useful for `ux-state` rendering or guard checks in components.
     * @param pattern single state name or array of names to compare against
     * @returns true if the current state is included in the pattern(s)
     */
    matches(pattern: string | string[]): boolean;
    /**
     * Check if an event can be handled in the current state
     * @param event event to check (can be string or object)
     * @returns true if the event has a handler in current state
     */
    can(event: StateEvent | string): boolean;
    /**
     * Get machine configuration
     */
    getMachineConfig(): MachineConfig<T>;
    /**
     * Get state configuration
     */
    getStateConfig(stateName?: string): any;
    /**
     * Reset to initial state
     */
    reset(): void;
}
export {};
