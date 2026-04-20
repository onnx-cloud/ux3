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
import type { AppContext } from '../ui/app.js';
import { ServiceLifecyclePhase } from '../core/lifecycle.js';
import { defaultLogger } from '../security/observability.js';

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
  cache?: {
    enabled?: boolean;
    ttl?: number; // Time to live in milliseconds
    key?: string; // Custom cache key
    maxEntries?: number; // Maximum number of cache entries to keep
  };
}

/**
 * Cache entry for invoke results
 */
export interface CacheEntry<T = any> {
  value: InvokeResult<T>;
  expiresAt: number; // Timestamp when cache expires
  createdAt: number;
}

/**
 * Middleware context for pre/post processing
 */
export interface MiddlewareContext {
  type: 'service' | 'src';
  service?: string;
  method?: string;
  src?: string;
  input?: any;
  timestamp: number;
}

/**
 * Pre-invoke middleware (before execution)
 * Can transform input or skip execution
 */
export type PreMiddleware = (
  context: MiddlewareContext,
  invoke: InvokeService | InvokeSrc
) => Promise<{
  skip?: boolean; // Skip execution and return default result
  input?: any; // Transformed input
  result?: InvokeResult; // Override result entirely
}>;

/**
 * Post-invoke middleware (after execution)
 * Can transform result or handle errors
 */
export type PostMiddleware = (
  context: MiddlewareContext,
  result: InvokeResult,
  error?: Error
) => Promise<InvokeResult>;

/**
 * Error middleware (on invoke failure)
 * Can retry, transform error, or recover
 */
export type ErrorMiddleware = (
  context: MiddlewareContext,
  error: Error,
  retry: () => Promise<InvokeResult>
) => Promise<InvokeResult>;

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
export interface InvokeRegistryOptions {
  maxCacheSize?: number;
  defaultCacheTTL?: number;
}

export class InvokeRegistry {
  private app: AppContext;
  private listeners: InvokeListener[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private cacheOrder: string[] = [];
  private invokeStats: Map<string, { count: number; totalTime: number }> = new Map();
  private cacheStats: Map<string, { hits: number; misses: number }> = new Map();
  private maxCacheSize = 1000;
  private defaultCacheTTL: number = 5 * 60 * 1000; // 5 minutes default
  private preMiddlewares: PreMiddleware[] = [];
  private postMiddlewares: PostMiddleware[] = [];
  private errorMiddlewares: ErrorMiddleware[] = [];
  private registeredServices: Set<string> = new Set(); // Track services for REGISTER phase

  constructor(app: AppContext, options: InvokeRegistryOptions = {}) {
    this.app = app;
    if (options.maxCacheSize !== undefined) {
      this.maxCacheSize = options.maxCacheSize;
    }
    if (options.defaultCacheTTL !== undefined) {
      this.defaultCacheTTL = options.defaultCacheTTL;
    }
  }

  /**
   * Register pre-invoke middleware
   * Executed before service invoke, can transform input or skip execution
   */
  usePreMiddleware(middleware: PreMiddleware): void {
    this.preMiddlewares.push(middleware);
  }

  /**
   * Register post-invoke middleware
   * Executed after service invoke, can transform result
   */
  usePostMiddleware(middleware: PostMiddleware): void {
    this.postMiddlewares.push(middleware);
  }

  /**
   * Register error middleware
   * Executed on invoke failure, can retry or recover
   */
  useErrorMiddleware(middleware: ErrorMiddleware): void {
    this.errorMiddlewares.push(middleware);
  }

  /**
   * Clear all registered middleware
   */
  clearMiddleware(): void {
    this.preMiddlewares = [];
    this.postMiddlewares = [];
    this.errorMiddlewares = [];
  }

  /**
   * Set default cache TTL (time to live) for all invokes
   * Default is 5 minutes (300,000ms)
   */
  setDefaultCacheTTL(ttl: number): void {
    this.defaultCacheTTL = ttl;
  }

  /**
   * Set maximum cache entries before eviction
   */
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = Math.max(0, size);
    this.enforceCacheSizeLimit(this.maxCacheSize);
  }

  /**
   * Get maximum cache size
   */
  getMaxCacheSize(): number {
    return this.maxCacheSize;
  }

  /**
   * Get default cache TTL
   */
  getDefaultCacheTTL(): number {
    return this.defaultCacheTTL;
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
    const mwContext: MiddlewareContext = {
      type: 'service',
      service: invoke.service,
      method: invoke.method || 'fetch',
      input: invoke.input,
      timestamp: startTime
    };

    // Execute pre-middleware
    try {
      const preResult = await this.executePreMiddleware(mwContext, invoke);
      if (preResult.skip) {
        return preResult.result || {
          success: false,
          error: new Error('Pre-middleware skipped execution'),
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: startTime
        };
      }
      if (preResult.input !== undefined) {
        (invoke as any).input = preResult.input;
      }
    } catch (err) {
      defaultLogger.error('[InvokeRegistry] Pre-middleware error', err instanceof Error ? err : new Error(String(err)), {
        phase: 'pre-middleware',
        service: invoke.service,
        method: invoke.method,
      });
      // Continue to normal execution
    }

    // Check cache if enabled
    const cacheEnabled = options?.cache?.enabled ?? false;
    if (cacheEnabled) {
      const cacheKey = options?.cache?.key || this.generateCacheKey('service', invoke.service, invoke.method || 'fetch');
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.recordCacheHit(cacheKey);
        // Apply post-middleware even to cached results
        try {
          return await this.executePostMiddleware(mwContext, cached);
        } catch (err) {
          defaultLogger.error('[InvokeRegistry] Post-middleware error', err instanceof Error ? err : new Error(String(err)), {
            phase: 'post-middleware',
            service: invoke.service,
            method: invoke.method,
          });
          return cached;
        }
      }
      this.recordCacheMiss(cacheKey);
    }

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
      
      // Execute error middleware
      try {
        const mwResult = await this.executeErrorMiddleware(mwContext, error, async () => ({
          success: false,
          error,
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: startTime
        }));
        if (mwResult) {
          return mwResult;
        }
      } catch (err) {
        defaultLogger.error('[InvokeRegistry] Error middleware error', err instanceof Error ? err : new Error(String(err)), {
          phase: 'error-middleware',
          service: invoke.service,
          method: invoke.method,
        });
      }

      return { success: false, error, duration: Date.now() - startTime, retries: 0, timestamp: startTime };
    }

    // Fire REGISTER phase on first service use
    await this.fireRegisterPhase(invoke.service);

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

        const result: InvokeResult = {
          success: true,
          data,
          duration: Date.now() - startTime,
          retries: retryCount,
          timestamp: startTime
        };

        // Cache successful result if caching enabled
        if (cacheEnabled) {
          const cacheKey = options?.cache?.key || this.generateCacheKey('service', invoke.service, invoke.method || 'fetch');
          const ttl = options?.cache?.ttl ?? this.defaultCacheTTL;
          const maxEntries = options?.cache?.maxEntries ?? this.maxCacheSize;
          this.setCachedResult(cacheKey, result, ttl, maxEntries);
        }

        // Fire READY phase on successful execution (Phase 1.4)
        await this.fireReadyPhase(invoke.service, result);

        // Execute post-middleware
        try {
          return await this.executePostMiddleware(mwContext, result);
        } catch (err) {
          defaultLogger.error('[InvokeRegistry] Post-middleware error', err instanceof Error ? err : new Error(String(err)), {
            phase: 'post-middleware',
            service: invoke.service,
            method: invoke.method || 'fetch',
          });
          return result;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          // Fire RECONNECT phase before retry (Phase 1.4)
          await this.fireReconnectPhase(invoke.service, attempt + 1);

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

    const finalError = lastError || new Error('Invoke failed');

    // Fire ERROR phase on final failure (Phase 1.4)
    await this.fireErrorPhase(invoke.service, finalError);

    // Execute error middleware
    try {
      const retryFn = async () => {
        // Retry the entire invoke
        return this.executeServiceInvoke(invoke, context, options);
      };

      const mwResult = await this.executeErrorMiddleware(mwContext, finalError, retryFn);
      if (mwResult) {
        return mwResult;
      }
    } catch (err) {
      defaultLogger.error('[InvokeRegistry] Error middleware error', err instanceof Error ? err : new Error(String(err)), {
        phase: 'error-middleware',
        service: invoke.service,
        method: invoke.method || 'fetch',
      });
    }

    return {
      success: false,
      error: finalError,
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
    const srcStr = typeof invoke.src === 'string' ? invoke.src : '<function>';
    const mwContext: MiddlewareContext = {
      type: 'src',
      src: srcStr,
      input: invoke.input,
      timestamp: startTime
    };

    // Execute pre-middleware
    try {
      const preResult = await this.executePreMiddleware(mwContext, invoke);
      if (preResult.skip) {
        return preResult.result || {
          success: false,
          error: new Error('Pre-middleware skipped execution'),
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: startTime
        };
      }
      if (preResult.input !== undefined) {
        (invoke as any).input = preResult.input;
      }
    } catch (err) {
      defaultLogger.error('[InvokeRegistry] Pre-middleware error', err instanceof Error ? err : new Error(String(err)), {
        phase: 'pre-middleware',
        src: srcStr,
      });
    }

    // Check cache if enabled
    const cacheEnabled = options?.cache?.enabled ?? false;
    if (cacheEnabled) {
      const cacheKey = options?.cache?.key || this.generateCacheKey('src', srcStr);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.recordCacheHit(cacheKey);
        try {
          return await this.executePostMiddleware(mwContext, cached);
        } catch (err) {
          defaultLogger.error('[InvokeRegistry] Post-middleware error', err instanceof Error ? err : new Error(String(err)), {
            phase: 'post-middleware',
            src: srcStr,
          });
          return cached;
        }
      }
      this.recordCacheMiss(cacheKey);
    }

    const maxRetries = options?.maxRetries ?? invoke.maxRetries ?? 0;
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let fn: Function | undefined;

        if (typeof invoke.src === 'function') {
          fn = invoke.src;
        } else if (typeof invoke.src === 'string') {
          fn = (globalThis as any)[invoke.src] || (context as any)?.[invoke.src];
        }

        if (!fn) {
          throw new Error(`Invoke source not found: ${invoke.src}`);
        }

        this.notifyListeners('start', {
          service: undefined,
          method: undefined,
          src: srcStr,
          status: 'start'
        });

        const data = await (fn as any)(invoke.input, context);

        this.notifyListeners('success', {
          service: undefined,
          method: undefined,
          src: srcStr,
          status: 'success',
          duration: Date.now() - startTime
        });

        const result: InvokeResult = {
          success: true,
          data,
          duration: Date.now() - startTime,
          retries: retryCount,
          timestamp: startTime
        };

        // Cache successful result if caching enabled
        if (cacheEnabled) {
          const cacheKey = options?.cache?.key || this.generateCacheKey('src', srcStr);
          const ttl = options?.cache?.ttl ?? this.defaultCacheTTL;
          const maxEntries = options?.cache?.maxEntries ?? this.maxCacheSize;
          this.setCachedResult(cacheKey, result, ttl, maxEntries);
        }

        // Execute post-middleware
        try {
          return await this.executePostMiddleware(mwContext, result);
        } catch (err) {
          defaultLogger.error('[InvokeRegistry] Post-middleware error', err instanceof Error ? err : new Error(String(err)), {
            phase: 'post-middleware',
            src: srcStr,
          });
          return result;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          retryCount++;
          const delay = this.calculateRetryDelay(invoke.retryDelay, attempt);

          this.notifyListeners('retry', {
            service: undefined,
            method: undefined,
            src: srcStr,
            error: lastError,
            duration: Date.now() - startTime,
            status: 'retry'
          });

          await this.sleep(delay);
        } else {
          this.notifyListeners('error', {
            service: undefined,
            method: undefined,
            src: srcStr,
            error: lastError,
            duration: Date.now() - startTime,
            status: 'error'
          });
        }
      }
    }

    const finalError = lastError || new Error('Invoke failed');

    // Execute error middleware
    try {
      const retryFn = async () => {
        return this.executeSrcInvoke(invoke, context, options);
      };

      const mwResult = await this.executeErrorMiddleware(mwContext, finalError, retryFn);
      if (mwResult) {
        return mwResult;
      }
    } catch (err) {
      defaultLogger.error('[InvokeRegistry] Error middleware error', err instanceof Error ? err : new Error(String(err)), {
        phase: 'error-middleware',
        src: srcStr,
      });
    }

    return {
      success: false,
      error: finalError,
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
   * Get cache statistics for a specific invoke
   */
  getCacheStats(service: string, method: string): { hits: number; misses: number; hitRate: number } | undefined {
    const key = `${service}.${method}`;
    const stat = this.cacheStats.get(key);
    if (!stat) return undefined;
    const total = stat.hits + stat.misses;
    return {
      ...stat,
      hitRate: total > 0 ? stat.hits / total : 0
    };
  }

  /**
   * Get cached result if it exists and hasn't expired
   */
  private getCachedResult(key: string): InvokeResult | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if cache has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.cacheOrder = this.cacheOrder.filter((item) => item !== key);
      return undefined;
    }

    // Promote entry to most recently used
    this.cacheOrder = this.cacheOrder.filter((item) => item !== key);
    this.cacheOrder.push(key);

    return entry.value;
  }

  /**
   * Set a cached result with TTL
   */
  private setCachedResult(key: string, result: InvokeResult, ttl: number, maxEntries: number = this.maxCacheSize): void {
    const now = Date.now();
    const entry: CacheEntry = {
      value: result,
      expiresAt: now + ttl,
      createdAt: now
    };

    if (!this.cache.has(key)) {
      this.cacheOrder.push(key);
    }

    this.cache.set(key, entry);
    this.enforceCacheSizeLimit(maxEntries);
  }

  private enforceCacheSizeLimit(maxEntries: number): void {
    while (this.cacheOrder.length > maxEntries) {
      const oldestKey = this.cacheOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Generate cache key from invoke type and parameters
   */
  private generateCacheKey(type: 'service' | 'src', ...params: string[]): string {
    // For service invokes: "api.getUser"
    // For src invokes: "src:<funcName>"
    if (type === 'service') {
      return params.join('.');
    }
    return `src.${params.join('.')}`;
  }

  /**
   * Record cache hit for statistics
   */
  private recordCacheHit(key: string): void {
    // Extract service.method format for stats tracking
    const statsKey = key.startsWith('src.') ? key : key;
    const stat = this.cacheStats.get(statsKey) || { hits: 0, misses: 0 };
    stat.hits++;
    this.cacheStats.set(statsKey, stat);
  }

  /**
   * Record cache miss for statistics
   */
  private recordCacheMiss(key: string): void {
    // Extract service.method format for stats tracking
    const statsKey = key.startsWith('src.') ? key : key;
    const stat = this.cacheStats.get(statsKey) || { hits: 0, misses: 0 };
    stat.misses++;
    this.cacheStats.set(statsKey, stat);
  }

  /**
   * Invalidate cache for specific invoke
   */
  invalidateCache(service: string, method: string): void {
    const key = this.generateCacheKey('service', service, method);
    this.cache.delete(key);
  }

  /**
   * Invalidate cache for specific source function
   */
  invalidateSrcCache(src: string): void {
    const key = this.generateCacheKey('src', src);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries for a service
   */
  invalidateServiceCache(service: string): void {
    for (const key of this.cache.keys()) {
      // Keys for service invokes are "service.method"
      if (key.startsWith(`${service}.`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get all active cache entries
   */
  getCacheEntries(): Record<string, { value: InvokeResult; expiresAt: number; createdAt: number }> {
    const entries: Record<string, { value: InvokeResult; expiresAt: number; createdAt: number }> = {};
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Only include non-expired entries
      if (now <= entry.expiresAt) {
        entries[key] = entry;
      }
    }

    return entries;
  }

  /**
   * Execute pre-middleware pipeline
   */
  private async executePreMiddleware(
    context: MiddlewareContext,
    invoke: InvokeService | InvokeSrc
  ): Promise<{ skip: boolean; input: any; result?: InvokeResult }> {
    let input = (invoke as any).input;
    let skip = false;
    let result: InvokeResult | undefined;

    for (const middleware of this.preMiddlewares) {
      const mwResult = await middleware(context, invoke);
      if (mwResult.skip) {
        skip = true;
        result = mwResult.result;
        break;
      }
      if (mwResult.input !== undefined) {
        input = mwResult.input;
      }
      if (mwResult.result) {
        result = mwResult.result;
        break;
      }
    }

    return { skip, input, result };
  }

  /**
   * Execute post-middleware pipeline
   */
  private async executePostMiddleware(
    context: MiddlewareContext,
    result: InvokeResult
  ): Promise<InvokeResult> {
    let processed = result;

    for (const middleware of this.postMiddlewares) {
      processed = await middleware(context, processed);
    }

    return processed;
  }

  /**
   * Execute error middleware pipeline
   */
  private async executeErrorMiddleware(
    context: MiddlewareContext,
    error: Error,
    retryFn: () => Promise<InvokeResult>
  ): Promise<InvokeResult | undefined> {
    if (this.errorMiddlewares.length === 0) {
      return undefined;
    }

    let result: InvokeResult | undefined;

    for (const middleware of this.errorMiddlewares) {
      result = await middleware(context, error, retryFn);
      if (result.success) {
        return result;
      }
    }

    return result;
  }

  /**
   * Clear all cached results and statistics
   */
  clear(): void {
    this.cache.clear();
    this.invokeStats.clear();
    this.cacheStats.clear();
  }

  /**
   * Clear statistics for a specific invoke
   */
  clearStats(service: string, method: string): void {
    this.invokeStats.delete(`${service}.${method}`);
    this.cacheStats.delete(`${service}.${method}`);
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
        defaultLogger.error('[InvokeRegistry] Listener error', err instanceof Error ? err : new Error(String(err)), {
          status,
          service: invoke.service,
          method: invoke.method,
          src: invoke.src,
        });
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

  /**
   * Fire REGISTER phase when a service is first registered/used
   * Phase 1.4: Lifecycle integration
   */
  private async fireRegisterPhase(serviceName: string): Promise<void> {
    if (this.registeredServices.has(serviceName)) return; // Already registered

    this.registeredServices.add(serviceName);

    if (this.app.hooks) {
      try {
        await this.app.hooks.execute(ServiceLifecyclePhase.REGISTER, {
          app: this.app,
          service: this.app.services[serviceName],
          phase: ServiceLifecyclePhase.REGISTER,
          meta: { serviceName }
        });
      } catch (err) {
        defaultLogger.error(`[InvokeRegistry] REGISTER hook error for ${serviceName}`, err instanceof Error ? err : new Error(String(err)), {
          phase: 'REGISTER',
          serviceName,
        });
      }
    }
  }

  /**
   * Fire AUTHENTICATE phase for authentication services
   * Phase 1.4: Lifecycle integration
   */
  private async fireAuthenticatePhase(serviceName: string): Promise<void> {
    if (this.app.hooks) {
      try {
        await this.app.hooks.execute(ServiceLifecyclePhase.AUTHENTICATE, {
          app: this.app,
          service: this.app.services[serviceName],
          phase: ServiceLifecyclePhase.AUTHENTICATE,
          meta: { serviceName }
        });
      } catch (err) {
        defaultLogger.error(`[InvokeRegistry] AUTHENTICATE hook error for ${serviceName}`, err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Fire READY phase when service call succeeds
   * Phase 1.4: Lifecycle integration
   */
  private async fireReadyPhase(serviceName: string, result: InvokeResult): Promise<void> {
    if (this.app.hooks) {
      try {
        await this.app.hooks.execute(ServiceLifecyclePhase.READY, {
          app: this.app,
          service: this.app.services[serviceName],
          phase: ServiceLifecyclePhase.READY,
          meta: { serviceName, result }
        });
      } catch (err) {
        defaultLogger.error(`[InvokeRegistry] READY hook error for ${serviceName}`, err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Fire ERROR phase when service call fails
   * Phase 1.4: Lifecycle integration
   */
  private async fireErrorPhase(serviceName: string, error: Error): Promise<void> {
    if (this.app.hooks) {
      try {
        await this.app.hooks.execute(ServiceLifecyclePhase.ERROR, {
          app: this.app,
          service: this.app.services[serviceName],
          phase: ServiceLifecyclePhase.ERROR,
          meta: { serviceName, error }
        });
      } catch (err) {
        defaultLogger.error(`[InvokeRegistry] ERROR hook error for ${serviceName}`, err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Fire RECONNECT phase when retrying after failure
   * Phase 1.4: Lifecycle integration
   */
  private async fireReconnectPhase(serviceName: string, attempt: number): Promise<void> {
    if (this.app.hooks) {
      try {
        await this.app.hooks.execute(ServiceLifecyclePhase.RECONNECT, {
          app: this.app,
          service: this.app.services[serviceName],
          phase: ServiceLifecyclePhase.RECONNECT,
          meta: { serviceName, attempt }
        });
      } catch (err) {
        defaultLogger.error(`[InvokeRegistry] RECONNECT hook error for ${serviceName}`, err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Fire DISCONNECT phase when service is disconnected/cleared
   * Phase 1.4: Lifecycle integration
   */
  private async fireDisconnectPhase(serviceName: string): Promise<void> {
    if (this.app.hooks) {
      try {
        await this.app.hooks.execute(ServiceLifecyclePhase.DISCONNECT, {
          app: this.app,
          service: this.app.services[serviceName],
          phase: ServiceLifecyclePhase.DISCONNECT,
          meta: { serviceName }
        });
      } catch (err) {
        defaultLogger.error(`[InvokeRegistry] DISCONNECT hook error for ${serviceName}`, err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Clear registered services and fire DISCONNECT for each
   * Phase 1.4: Lifecycle integration
   */
  async clearRegisteredServices(): Promise<void> {
    for (const serviceName of this.registeredServices) {
      await this.fireDisconnectPhase(serviceName);
    }
    this.registeredServices.clear();
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
