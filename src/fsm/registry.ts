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

export interface FSMRegistryConfig {
  namespace: string;
  fsm: StateMachine<any>;
}

/**
 * Global FSM registry
 * Maps namespace → FSM instance
 */
export class FSMRegistry {
  private static instances = new Map<string, StateMachine<any>>();

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
   * Clear all FSMs (for testing)
   */
  static clear(): void {
    this.instances.clear();
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
