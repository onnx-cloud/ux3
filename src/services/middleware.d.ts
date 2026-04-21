/**
 * Service Middleware System
 * Request/response logging, monitoring, and interception capabilities
 */
import type { Middleware, RequestConfig, ServiceResponse } from './types.js';
/**
 * Logging context for middleware
 */
export interface LogContext {
    timestamp: number;
    method: string;
    url?: string;
    status?: number;
    duration?: number;
    error?: Error;
}
/**
 * Built-in middleware for request/response logging
 * Logs HTTP requests, responses, and errors for monitoring
 */
export declare const loggingMiddleware: (prefix?: string) => Middleware<RequestConfig, ServiceResponse>;
/**
 * Built-in middleware for request timeout tracking
 * Measures request duration and warns on slow requests
 */
export declare const timeoutWarningMiddleware: (threshold?: number) => Middleware<RequestConfig, ServiceResponse>;
/**
 * Built-in middleware for request mutation tracking
 * Logs when requests are modified by other middleware
 */
export declare const requestMutationMiddleware: () => Middleware<RequestConfig, ServiceResponse>;
/**
 * Built-in middleware for response caching hint
 * Tracks cache hits/misses for monitoring
 */
export declare const cacheTrackingMiddleware: () => Middleware<RequestConfig, ServiceResponse>;
/**
 * Built-in middleware for request header augmentation
 * Adds custom headers, auth tokens, correlation IDs, etc.
 */
export declare const headerAugmentationMiddleware: (augment: (request: RequestConfig) => Record<string, string>) => Middleware<RequestConfig, ServiceResponse>;
/**
 * Built-in middleware for error retry with exponential backoff
 * Attempts to retry failed requests with increasing delays
 */
export declare const retryMiddleware: (maxRetries?: number, initialDelay?: number) => Middleware<RequestConfig, ServiceResponse>;
/**
 * Built-in middleware for circuit breaker pattern
 * Fails fast after repeated failures to prevent cascading errors
 */
export declare const circuitBreakerMiddleware: (failureThreshold?: number, resetTimeout?: number) => Middleware<RequestConfig, ServiceResponse>;
/**
 * Create a middleware that composes multiple middlewares into one
 * Useful for applying a group of related middlewares
 */
export declare const composeMiddleware: (middlewares: Array<Middleware<RequestConfig, ServiceResponse>>) => Middleware<RequestConfig, ServiceResponse>;
/**
 * Preset: Standard middleware stack for production
 * Includes logging, error handling, and performance monitoring
 */
export declare const productionMiddlewareStack: () => Middleware<RequestConfig, ServiceResponse>;
/**
 * Preset: Development middleware stack
 * Includes verbose logging and mutation tracking
 */
export declare const developmentMiddlewareStack: () => Middleware<RequestConfig, ServiceResponse>;
