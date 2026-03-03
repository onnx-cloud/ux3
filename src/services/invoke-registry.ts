/**
 * InvokeRegistry - Central registry for service invocations
 * 
 * Manages invocations from FSM states, enabling:
 * - Centralized invoke handling (decoupled from ViewComponent)
 * - Middleware application to all service calls
 * - Retry logic, error handling, monitoring
 * - Testing of service invocations independently
 * 
 * This is part of Phase 1.2 architectural refactor to separate concerns:
 * - ViewComponent handles UI rendering
 * - FSM handles state management  
 * - InvokeRegistry handles service orchestration
 */

import type { InvokeSrc, InvokeService } from '../fsm/types.js';
import type { Service } from './types.js';
import type { AppContext } from './app.js';

/**
 * Result of an invoke execution
 */
export interface InvokeResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  retries: number;
  timestamp: number;
}

/**
 * Invoke execution options
 */
export interface InvokeOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number | ((attempt: number) => number);
  context?: Record<string, any>;
}

/**
 * Invoke listener for monitoring
 */
export type InvokeListener = (invoke: {
  service?: string;
  method?: string;
  src?: string;
  status: 'start' | 'success' | 'error' | 'retry';
  duration?: number;
  error?: Error;
}) => void;

/**
 * InvokeRegistry - Central registry for all service invocations
 * 
 * Usage:
 * ```typescript
 * const registry = new InvokeRegistry(appContext);
 * 
 * // Execute a service invoke
 * const result = await registry.executeInvoke({
 *   service: 'api',
 *   method: 'fetch',
 *   input: { url: '/users' }
 * }, context);
 * 
 * // Execute a src invoke (local function)
 * const result = await registry.executeInvoke({
 *   src: myLocalFunction,
 *   input: { data: 'test' }
 * }, context);
 * 
 * // Monitor invokes
 * registry.onInvoke((invoke) => {
 *   console.log(`Invoke ${invoke.service}.${invoke.method} took ${invoke.duration}ms`);
 * });
 * ```
 */
export class InvokeRegistry {
  private app: AppContext;
  private listeners: InvokeListener[] = [];
  private invokeCache: Map<string, InvokeResult> = new Map();
  private invokeStats: Map<string, { count: number; totalTime: number }> = new Map();

  constructor(app: AppContext) {
    this.app = app;
  }

  /**
   * Register a listener for invoke events
   */
  onInvoke(listener: InvokeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Unregister a listener
   */
  offInvoke(listener: InvokeListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }

  /**
   * Execute a service invoke (service + method call)
   */
  async executeServiceInvoke(
    invoke: InvokeService,
    context?: Record<string, any>,
    options?: InvokeOptions
  ): Promise<InvokeResult> {
    const startTime = Date.now();
    const maxRetries = options?.maxRetries ?? invoke.maxRetries ?? 0;
    const service = this.app.services[invoke.service];

    if (!service) {
      const error = new Error(`Service not registered: ${invoke.service}`);
      this.notifyListeners('error', {
        service: invoke.service,
        method: invoke.method || 'fetch',
        src: undefined,
        error,
        duration: Date.now() - startTime,
        status: 'error'
      });
      return { success: false, error, duration: Date.now() - startTime, retries: 0, timestamp: startTime };
    }

    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.notifyListeners('start', {
          service: invoke.service,
          method: invoke.method || 'fetch',
          status: 'start'
        });

        const method = invoke.method || 'fetch';
        const data = await (service as any)[method](invoke.input, context);

        this.notifyListeners('success', {
          service: invoke.service,
          method,
          status: 'success',
          duration: Date.now() - startTime
        });

        this.recordInvokeStats(invoke.service, method, Date.now() - startTime);

        return {
          success: true,
          data,
          duration: Date.now() - startTime,
          retries: retryCount,
          timestamp: startTime
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          retryCount++;
          const delay = this.calculateRetryDelay(invoke.retryDelay, attempt);
          
          this.notifyListeners('retry', {
            service: invoke.service,
            method: invoke.method || 'fetch',
            error: lastError,
            duration: Date.now() - startTime,
            status: 'retry'
          });

          await this.sleep(delay);
        } else {
          this.notifyListeners('error', {
            service: invoke.service,
            method: invoke.method || 'fetch',
            error: lastError,
            duration: Date.now() - startTime,
            status: 'error'
          });
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error('Invoke failed'),
      duration: Date.now() - startTime,
      retries: retryCount,
      timestamp: startTime
    };
  }

  /**
   * Execute a source invoke (local function)
   */
  async executeSrcInvoke(
    invoke: InvokeSrc,
    context?: Record<string, any>,
    options?: InvokeOptions
  ): Promise<InvokeResult> {
    const startTime = Date.now();
    const maxRetries = options?.maxRetries ?? invoke.maxRetries ?? 0;
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let fn: Function | undefined;

        if (typeof invoke.src === 'function') {
          fn = invoke.src;
        } else if (typeof invoke.src === 'string') {
          // Look up function by name in window or context
          fn = (globalThis as any)[invoke.src] || (context as any)?.[invoke.src];
        }

        if (!fn) {
          throw new Error(`Invoke source not found: ${invoke.src}`);
        }

        this.notifyListeners('start', {
          service: undefined,
          method: undefined,
          src: typeof invoke.src === 'string' ? invoke.src : '<function>',
          status: 'start'
        });

        const data = await (fn as any)(invoke.input, context);

        this.notifyListeners('success', {
          service: undefined,
          method: undefined,
          src: typeof invoke.src === 'string' ? invoke.src : '<function>',
          status: 'success',
          duration: Date.now() - startTime
        });

        return {
          success: true,
          data,
          duration: Date.now() - startTime,
          retries: retryCount,
          timestamp: startTime
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          retryCount++;
          const delay = this.calculateRetryDelay(invoke.retryDelay, attempt);

          this.notifyListeners('retry', {
            service: undefined,
            method: undefined,
            src: typeof invoke.src === 'string' ? invoke.src : '<function>',
            error: lastError,
            duration: Date.now() - startTime,
            status: 'retry'
          });

          await this.sleep(delay);
        } else {
          this.notifyListeners('error', {
            service: undefined,
            method: undefined,
            src: typeof invoke.src === 'string' ? invoke.src : '<function>',
            error: lastError,
            duration: Date.now() - startTime,
            status: 'error'
          });
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error('Invoke failed'),
      duration: Date.now() - startTime,
      retries: retryCount,
      timestamp: startTime
    };
  }

  /**
   * Execute an invoke (either service or src)
   * Unified interface that handles both types
   */
  async executeInvoke(
    invoke: InvokeService | InvokeSrc,
    context?: Record<string, any>,
    options?: InvokeOptions
  ): Promise<InvokeResult> {
    const inv = invoke as any;

    if (inv.service) {
      return this.executeServiceInvoke(inv as InvokeService, context, options);
    } else if (inv.src) {
      return this.executeSrcInvoke(inv as InvokeSrc, context, options);
    } else {
      return {
        success: false,
        error: new Error('Invalid invoke config: must have either "service" or "src"'),
        duration: 0,
        retries: 0,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get invoke statistics (call count, average time, etc.)
   */
  getStats(service: string, method: string): { count: number; totalTime: number; avgTime: number } | undefined {
    const key = `${service}.${method}`;
    const stat = this.invokeStats.get(key);
    if (!stat) return undefined;
    return {
      ...stat,
      avgTime: stat.totalTime / stat.count
    };
  }

  /**
   * Clear all cached results and statistics
   */
  clear(): void {
    this.invokeCache.clear();
    this.invokeStats.clear();
  }

  /**
   * Clear statistics for a specific invoke
   */
  clearStats(service: string, method: string): void {
    this.invokeStats.delete(`${service}.${method}`);
  }

  /**
   * Notify all listeners of an invoke event
   */
  private notifyListeners(status: 'start' | 'success' | 'error' | 'retry', invoke: {
    service?: string;
    method?: string;
    src?: string;
    error?: Error;
    duration?: number;
    status: 'start' | 'success' | 'error' | 'retry';
  }): void {
    for (const listener of this.listeners) {
      try {
        listener(invoke);
      } catch (err) {
        console.error('[InvokeRegistry] Listener error:', err);
      }
    }
  }

  /**
   * Record statistics for an invoke
   */
  private recordInvokeStats(service: string, method: string, duration: number): void {
    const key = `${service}.${method}`;
    const stat = this.invokeStats.get(key) || { count: 0, totalTime: 0 };
    stat.count++;
    stat.totalTime += duration;
    this.invokeStats.set(key, stat);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(
    retryDelay: number | ((attempt: number) => number) | undefined,
    attempt: number
  ): number {
    if (!retryDelay) return 0;
    if (typeof retryDelay === 'number') return retryDelay;
    return retryDelay(attempt);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global InvokeRegistry singleton
 * Lazily initialized when first accessed
 */
let globalRegistry: InvokeRegistry | null = null;

/**
 * Get or create the global InvokeRegistry
 * Called by AppContextBuilder during setup
 */
export function initializeGlobalInvokeRegistry(app: AppContext): InvokeRegistry {
  if (!globalRegistry) {
    globalRegistry = new InvokeRegistry(app);
  }
  return globalRegistry;
}

/**
 * Get the global InvokeRegistry (returns null if not initialized)
 */
export function getGlobalInvokeRegistry(): InvokeRegistry | null {
  return globalRegistry;
}

/**
 * Clear the global registry (for testing)
 */
export function clearGlobalInvokeRegistry(): void {
  globalRegistry = null;
}
