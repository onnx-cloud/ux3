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
import type { AppContext } from '../ui/app.js';
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
        ttl?: number;
        key?: string;
        maxEntries?: number;
    };
}
/**
 * Cache entry for invoke results
 */
export interface CacheEntry<T = any> {
    value: InvokeResult<T>;
    expiresAt: number;
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
export type PreMiddleware = (context: MiddlewareContext, invoke: InvokeService | InvokeSrc) => Promise<{
    skip?: boolean;
    input?: any;
    result?: InvokeResult;
}>;
/**
 * Post-invoke middleware (after execution)
 * Can transform result or handle errors
 */
export type PostMiddleware = (context: MiddlewareContext, result: InvokeResult, error?: Error) => Promise<InvokeResult>;
/**
 * Error middleware (on invoke failure)
 * Can retry, transform error, or recover
 */
export type ErrorMiddleware = (context: MiddlewareContext, error: Error, retry: () => Promise<InvokeResult>) => Promise<InvokeResult>;
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
export declare class InvokeRegistry {
    private app;
    private listeners;
    private cache;
    private cacheOrder;
    private invokeStats;
    private cacheStats;
    private maxCacheSize;
    private defaultCacheTTL;
    private preMiddlewares;
    private postMiddlewares;
    private errorMiddlewares;
    private registeredServices;
    constructor(app: AppContext, options?: InvokeRegistryOptions);
    /**
     * Register pre-invoke middleware
     * Executed before service invoke, can transform input or skip execution
     */
    usePreMiddleware(middleware: PreMiddleware): void;
    /**
     * Register post-invoke middleware
     * Executed after service invoke, can transform result
     */
    usePostMiddleware(middleware: PostMiddleware): void;
    /**
     * Register error middleware
     * Executed on invoke failure, can retry or recover
     */
    useErrorMiddleware(middleware: ErrorMiddleware): void;
    /**
     * Clear all registered middleware
     */
    clearMiddleware(): void;
    /**
     * Set default cache TTL (time to live) for all invokes
     * Default is 5 minutes (300,000ms)
     */
    setDefaultCacheTTL(ttl: number): void;
    /**
     * Set maximum cache entries before eviction
     */
    setMaxCacheSize(size: number): void;
    /**
     * Get maximum cache size
     */
    getMaxCacheSize(): number;
    /**
     * Get default cache TTL
     */
    getDefaultCacheTTL(): number;
    /**
     * Register a listener for invoke events
     */
    onInvoke(listener: InvokeListener): void;
    /**
     * Unregister a listener
     */
    offInvoke(listener: InvokeListener): void;
    /**
     * Execute a service invoke (service + method call)
     */
    executeServiceInvoke(invoke: InvokeService, context?: Record<string, any>, options?: InvokeOptions): Promise<InvokeResult>;
    /**
     * Execute a source invoke (local function)
     */
    executeSrcInvoke(invoke: InvokeSrc, context?: Record<string, any>, options?: InvokeOptions): Promise<InvokeResult>;
    /**
     * Execute an invoke (either service or src)
     * Unified interface that handles both types
     */
    executeInvoke(invoke: InvokeService | InvokeSrc, context?: Record<string, any>, options?: InvokeOptions): Promise<InvokeResult>;
    /**
     * Get invoke statistics (call count, average time, etc.)
     */
    getStats(service: string, method: string): {
        count: number;
        totalTime: number;
        avgTime: number;
    } | undefined;
    /**
     * Get cache statistics for a specific invoke
     */
    getCacheStats(service: string, method: string): {
        hits: number;
        misses: number;
        hitRate: number;
    } | undefined;
    /**
     * Get cached result if it exists and hasn't expired
     */
    private getCachedResult;
    /**
     * Set a cached result with TTL
     */
    private setCachedResult;
    private enforceCacheSizeLimit;
    /**
     * Generate cache key from invoke type and parameters
     */
    private generateCacheKey;
    /**
     * Record cache hit for statistics
     */
    private recordCacheHit;
    /**
     * Record cache miss for statistics
     */
    private recordCacheMiss;
    /**
     * Invalidate cache for specific invoke
     */
    invalidateCache(service: string, method: string): void;
    /**
     * Invalidate cache for specific source function
     */
    invalidateSrcCache(src: string): void;
    /**
     * Invalidate all cache entries for a service
     */
    invalidateServiceCache(service: string): void;
    /**
     * Get all active cache entries
     */
    getCacheEntries(): Record<string, {
        value: InvokeResult;
        expiresAt: number;
        createdAt: number;
    }>;
    /**
     * Execute pre-middleware pipeline
     */
    private executePreMiddleware;
    /**
     * Execute post-middleware pipeline
     */
    private executePostMiddleware;
    /**
     * Execute error middleware pipeline
     */
    private executeErrorMiddleware;
    /**
     * Clear all cached results and statistics
     */
    clear(): void;
    /**
     * Clear statistics for a specific invoke
     */
    clearStats(service: string, method: string): void;
    /**
     * Notify all listeners of an invoke event
     */
    private notifyListeners;
    /**
     * Record statistics for an invoke
     */
    private recordInvokeStats;
    /**
     * Calculate retry delay
     */
    private calculateRetryDelay;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
    /**
     * Fire REGISTER phase when a service is first registered/used
     * Phase 1.4: Lifecycle integration
     */
    private fireRegisterPhase;
    /**
     * Fire AUTHENTICATE phase for authentication services
     * Phase 1.4: Lifecycle integration
     */
    private fireAuthenticatePhase;
    /**
     * Fire READY phase when service call succeeds
     * Phase 1.4: Lifecycle integration
     */
    private fireReadyPhase;
    /**
     * Fire ERROR phase when service call fails
     * Phase 1.4: Lifecycle integration
     */
    private fireErrorPhase;
    /**
     * Fire RECONNECT phase when retrying after failure
     * Phase 1.4: Lifecycle integration
     */
    private fireReconnectPhase;
    /**
     * Fire DISCONNECT phase when service is disconnected/cleared
     * Phase 1.4: Lifecycle integration
     */
    private fireDisconnectPhase;
    /**
     * Clear registered services and fire DISCONNECT for each
     * Phase 1.4: Lifecycle integration
     */
    clearRegisteredServices(): Promise<void>;
}
/**
 * Get or create the global InvokeRegistry
 * Called by AppContextBuilder during setup
 */
export declare function initializeGlobalInvokeRegistry(app: AppContext): InvokeRegistry;
/**
 * Get the global InvokeRegistry (returns null if not initialized)
 */
export declare function getGlobalInvokeRegistry(): InvokeRegistry | null;
/**
 * Clear the global registry (for testing)
 */
export declare function clearGlobalInvokeRegistry(): void;
