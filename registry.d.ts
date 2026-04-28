/**
 * FSM Registry - Hierarchical namespace-based FSM management
 *
 * Each namespace (auth, account, dashboard) has its own FSM instance.
 * Views lookup FSMs by extracting namespace from ux-state attribute.
 *
 * @example
 * ```typescript
 * // Initialize
 * const authFsm = new FSM(authConfig);
 * FSMRegistry.register('auth', authFsm);
 *
 * // Lookup
 * const fsm = FSMRegistry.get('auth');
 * fsm?.subscribe((state) => {});
 * ```
 */
import { StateMachine } from './src/fsm/state-machine.ts';
import type { StateEvent } from './src/fsm/types.js';
import { ServiceCache } from './src/core/service-cache.ts';
export interface FSMRegistryConfig {
    namespace: string;
    fsm: StateMachine<any>;
}
/**
 * Global FSM registry
 * Maps namespace → FSM instance
 */
export declare class FSMRegistry {
    private static instances;
    private static globalContext;
    private static globalServices;
    private static globalSubscribers;
    private static caches;
    /**
     * Set global context shared across all FSMs
     */
    static setGlobalContext(ctx: Record<string, any>): void;
    /**
     * Get global context
     */
    static getGlobalContext(): Record<string, any>;
    /**
     * Register global services
     */
    static registerServices(services: Record<string, any>): void;
    /**
     * Get global services
     */
    static getServices(): Record<string, any>;
    /**
     * Register an FSM under a namespace
     */
    static register(namespace: string, fsm: StateMachine<any>): void;
    /**
     * Subscribe to all global events broadcast via `broadcastGlobal`.
     * Returns an unsubscribe function.
     */
    static subscribeGlobal(listener: (event: StateEvent) => void): () => void;
    /**
     * Get FSM by namespace
     * Returns null if not registered
     */
    static get(namespace: string): StateMachine<any> | null;
    /**
     * Check if namespace is registered
     */
    static has(namespace: string): boolean;
    /**
     * Get all registered FSMs
     */
    static getAll(): Map<string, StateMachine<any>>;
    /**
     * List all registered namespaces
     */
    static list(): string[];
    /**
     * Unregister FSM (rarely needed in production)
     */
    static unregister(namespace: string): boolean;
    /**
     * Validate that all required namespaces are registered
     */
    static validate(required: string[]): string[];
    /**
     * Broadcast an event to all registered FSMs. Useful for global events.
     */
    static broadcastGlobal(event: StateEvent | string): void;
    /**
     * Get or create a service cache for a given service name
     * Each service gets its own cache with default 60-second TTL
     *
     * @param serviceName - Name of the service
     * @param ttlMs - Custom TTL in milliseconds (default: 60000)
     * @returns ServiceCache instance for the service
     */
    static getServiceCache(serviceName: string, ttlMs?: number): ServiceCache<any>;
    /**
     * Clear a specific service cache
     *
     * @param serviceName - Name of the service cache to clear
     */
    static clearServiceCache(serviceName: string): void;
    /**
     * Clear all service caches
     */
    static clearAllServiceCaches(): void;
    /**
     * Clear FSM instances and all caches for testing
     */
    static clear(): void;
}
/**
 * Extract namespace from ux-state attribute
 * Examples:
 * - 'account.loaded' → 'account'
 * - 'auth.authenticated' → 'auth'
 * - 'nested.namespace.state' → 'nested' (only first part)
 */
export declare function extractNamespace(uxState: string): string;
/**
 * Extract state path from ux-state attribute
 * Examples:
 * - 'account.loaded' → 'loaded'
 * - 'auth.authenticated' → 'authenticated'
 * - 'order.details.loading' → 'details.loading'
 */
export declare function extractState(uxState: string): string;
