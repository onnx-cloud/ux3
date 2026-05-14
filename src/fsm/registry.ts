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

import { StateMachine } from './state-machine.js';
import type { StateEvent } from './types.js';
import { ServiceCache } from '../core/service-cache.js';
import { reactive, effect } from '../state/reactive.js';

export interface FSMRegistryConfig {
  namespace: string;
  fsm: StateMachine<any>;
}

export interface ContextStorageAdapter {
  connect?: () => Promise<void>;
  get(model: string, id: any): Promise<any>;
  set(model: string, id: any, data: any): Promise<void>;
  delete?(model: string, id: any): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function traverseReactive(value: unknown): void {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    const nested = value[key];
    traverseReactive(nested);
  }
}

/**
 * Global FSM registry
 * Maps namespace → FSM instance
 */
export class FSMRegistry {
  private static instances = new Map<string, StateMachine<any>>();
  private static globalContext: Record<string, any> = reactive({});
  private static contextStore?: ContextStorageAdapter;
  private static persistTTL?: number;
  private static persistVersion = 0;
  private static machinePersistenceUnsubscribes = new Map<string, () => void>();
  private static globalServices: Record<string, any> = {};
  private static globalSubscribers: Array<(event: StateEvent) => void> = [];
  private static caches = new Map<string, ServiceCache<any>>();

  /**
   * Set root app context shared across all FSMs
   */
  static setRootContext(ctx: Record<string, any>, persist: boolean = true): void {
    if (!isRecord(ctx)) return;
    Object.assign(this.globalContext, ctx);
    if (persist && this.contextStore) {
      this.persistRootContext().catch((error) => {
        console.warn('[FSMRegistry] failed to persist root context', error);
      });
    }
    for (const fsm of this.instances.values()) {
      const candidate = fsm as unknown as Record<string, unknown>;
      if (typeof candidate.updateGlobalContext === 'function') {
        (candidate.updateGlobalContext as (context: Record<string, any>) => void)(this.getRootContext());
      }
    }
  }

  /**
   * Get the live root app context object
   */
  static getRootContext(): Record<string, any> {
    return this.globalContext;
  }

  /**
   * Alias for backwards compatibility.
   */
  static setGlobalContext(ctx: Record<string, any>): void {
    this.setRootContext(ctx);
  }

  /**
   * Alias for backwards compatibility.
   */
  static getGlobalContext(): Record<string, any> {
    return this.getRootContext();
  }

  static async initContextStorage(adapter?: ContextStorageAdapter, ttlSeconds?: number): Promise<void> {
    if (!adapter) {
      this.contextStore = undefined;
      this.persistTTL = undefined;
      return;
    }
    this.contextStore = adapter;
    this.persistTTL = typeof ttlSeconds === 'number' && ttlSeconds > 0 ? ttlSeconds : undefined;

    if (typeof adapter.connect === 'function') {
      try {
        await adapter.connect();
      } catch (error) {
        console.warn('[FSMRegistry] context storage connect failed', error);
      }
    }

    try {
      const snapshot = await adapter.get('ux3.ctx', 'root');
      if (isRecord(snapshot) && !this.isSnapshotStale(snapshot)) {
        if (isRecord(snapshot.context)) {
          this.setRootContext(snapshot.context, false);
        }
      }
    } catch (error) {
      console.warn('[FSMRegistry] failed to hydrate root context', error);
    }
  }

  static subscribeRoot(listener: (context: Record<string, any>) => void): () => void {
    const wrapped = () => {
      listener(this.getRootContext());
      traverseReactive(this.globalContext);
    };
    return effect(wrapped);
  }

  private static async persistRootContext(): Promise<void> {
    if (!this.contextStore) return;
    const snapshot = {
      id: 'root',
      state: 'root',
      context: this.getRootContext(),
      version: ++this.persistVersion,
      updatedAt: Date.now(),
    };
    await this.contextStore.set('ux3.ctx', 'root', snapshot);
  }

  private static isSnapshotStale(snapshot: Record<string, any>): boolean {
    if (!this.persistTTL || typeof snapshot.updatedAt !== 'number') return false;
    return Date.now() > snapshot.updatedAt + this.persistTTL * 1000;
  }

  static async registerMachine(namespace: string, fsm: StateMachine<any>): Promise<void> {
    this.register(namespace, fsm);
    if (this.contextStore) {
      await this.hydrateMachineSnapshot(namespace, fsm);
      const unsubscribe = fsm.subscribe((state, context) => {
        void this.persistMachineSnapshot(namespace, state, context);
      });
      this.machinePersistenceUnsubscribes.set(namespace, unsubscribe);
    }
  }

  private static async hydrateMachineSnapshot(namespace: string, fsm: StateMachine<any>): Promise<void> {
    if (!this.contextStore) return;
    try {
      const snapshot = await this.contextStore.get('ux3.ctx', namespace);
      if (!isRecord(snapshot) || this.isSnapshotStale(snapshot)) return;
      if (typeof (fsm as any).restoreSnapshot === 'function') {
        (fsm as any).restoreSnapshot(snapshot);
      }
    } catch (error) {
      console.warn(`[FSMRegistry] failed to hydrate machine snapshot for ${namespace}`, error);
    }
  }

  private static async persistMachineSnapshot(namespace: string, state: string, context: Record<string, any>): Promise<void> {
    if (!this.contextStore) return;
    const snapshot = {
      id: namespace,
      state,
      context: { ...context },
      version: ++this.persistVersion,
      updatedAt: Date.now(),
    };
    try {
      await this.contextStore.set('ux3.ctx', namespace, snapshot);
    } catch (error) {
      console.warn(`[FSMRegistry] failed to persist machine snapshot for ${namespace}`, error);
    }
  }

  /**
   * Register global services
   */
  static registerServices(services: Record<string, any>): void {
    this.globalServices = { ...this.globalServices, ...services };
  }

  /**
   * Get global services
   */
  static getServices(): Record<string, any> {
    return this.globalServices;
  }

  /**
   * Register an FSM under a namespace
   */
  static register(namespace: string, fsm: StateMachine<any>): void {
    if (!namespace || typeof namespace !== 'string') {
      throw new Error('[UX3] FSM namespace must be a non-empty string');
    }
    if (!fsm) {
      throw new Error(`[UX3] FSM for namespace '${namespace}' must be defined`);
    }
    this.instances.set(namespace, fsm);
    fsm.setFSMLookup((ns: string) => this.instances.get(ns) || null);
  }

  /**
   * Subscribe to all global events broadcast via `broadcastGlobal`.
   * Returns an unsubscribe function.
   */
  static subscribeGlobal(listener: (event: StateEvent) => void): () => void {
    this.globalSubscribers.push(listener);
    return () => {
      const idx = this.globalSubscribers.indexOf(listener);
      if (idx !== -1) this.globalSubscribers.splice(idx, 1);
    };
  }

  /**
   * Get FSM by namespace
   * Returns null if not registered
   */
  static get(namespace: string): StateMachine<any> | null {
    return this.instances.get(namespace) || null;
  }

  /**
   * Check if namespace is registered
   */
  static has(namespace: string): boolean {
    return this.instances.has(namespace);
  }

  /**
   * Get all registered FSMs
   */
  static getAll(): Map<string, StateMachine<any>> {
    return new Map(this.instances);
  }

  /**
   * List all registered namespaces
   */
  static list(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Unregister FSM (rarely needed in production)
   */
  static unregister(namespace: string): boolean {
    return this.instances.delete(namespace);
  }

  /**
   * Validate that all required namespaces are registered
   */
  static validate(required: string[]): string[] {
    const missing = required.filter((ns) => !this.has(ns));
    if (missing.length > 0) {
      console.error(`[UX3] Missing FSM registrations: ${missing.join(', ')}`);
    }
    return missing;
  }

  /**
   * Broadcast an event to all registered FSMs. Useful for global events.
   */
  static broadcastGlobal(event: StateEvent | string): void {
    const normalized: StateEvent =
      typeof event === 'string' ? { type: event } : event;
    // deliver to all machines
    for (const fsm of this.instances.values()) {
      fsm.send(normalized);
    }
    // notify global subscribers as well
    this.globalSubscribers.forEach((sub) => {
      try {
        sub(normalized);
      } catch (_e) {
        console.warn('[FSMRegistry] global subscriber error', _e instanceof Error ? _e.message : String(_e));
      }
    });
  }

  /**
   * Get or create a service cache for a given service name
   * Each service gets its own cache with default 60-second TTL
   *
   * @param serviceName - Name of the service
   * @param ttlMs - Custom TTL in milliseconds (default: 60000)
   * @returns ServiceCache instance for the service
   */
  static getServiceCache(serviceName: string, ttlMs: number = 60000): ServiceCache<any> {
    if (!serviceName || typeof serviceName !== 'string') {
      throw new Error('[UX3] Service name must be a non-empty string');
    }
    if (!this.caches.has(serviceName)) {
      this.caches.set(serviceName, new ServiceCache(ttlMs));
    }
    return this.caches.get(serviceName)!;
  }

  /**
   * Clear a specific service cache
   *
   * @param serviceName - Name of the service cache to clear
   */
  static clearServiceCache(serviceName: string): void {
    const cache = this.caches.get(serviceName);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * Clear all service caches
   */
  static clearAllServiceCaches(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Clear FSM instances and all caches for testing
   */
  static clear(): void {
    this.instances.clear();
    this.globalContext = reactive({});
    this.contextStore = undefined;
    this.persistTTL = undefined;
    this.persistVersion = 0;
    this.globalServices = {};
    this.globalSubscribers = [];
    for (const unsubscribe of this.machinePersistenceUnsubscribes.values()) {
      unsubscribe();
    }
    this.machinePersistenceUnsubscribes.clear();
    this.clearAllServiceCaches();
  }
}

/**
 * Extract namespace from ux-state attribute
 * Examples:
 * - 'account.loaded' → 'account'
 * - 'auth.authenticated' → 'auth'
 * - 'nested.namespace.state' → 'nested' (only first part)
 */
export function extractNamespace(uxState: string): string {
  const parts = uxState.split('.');
  return parts[0];
}

/**
 * Extract state path from ux-state attribute
 * Examples:
 * - 'account.loaded' → 'loaded'
 * - 'auth.authenticated' → 'authenticated'
 * - 'order.details.loading' → 'details.loading'
 */
export function extractState(uxState: string): string {
  const parts = uxState.split('.');
  return parts.slice(1).join('.');
}
