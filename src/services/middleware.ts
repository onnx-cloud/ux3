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
export const loggingMiddleware = (prefix = '[Service]'): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    const context: LogContext = {
      timestamp: Date.now(),
      method: request.method || 'GET',
      url: request.baseUrl,
    };

    try {
      const response = await next(request);
      context.status = response.status;
      context.duration = Date.now() - context.timestamp;

      console.log(
        `${prefix} ${context.method} ${context.url} - ${context.status} (${context.duration}ms)`,
        { request, response }
      );

      return response;
    } catch (error) {
      context.error = error as Error;
      context.duration = Date.now() - context.timestamp;

      console.error(
        `${prefix} ${context.method} ${context.url} - ERROR after ${context.duration}ms`,
        { request, error }
      );

      throw error;
    }
  };
};

/**
 * Built-in middleware for request timeout tracking
 * Measures request duration and warns on slow requests
 */
export const timeoutWarningMiddleware = (threshold = 5000): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    const startTime = Date.now();
    const response = await next(request);
    const duration = Date.now() - startTime;

    if (duration > threshold) {
      console.warn(
        `[Service] Slow request: ${request.method || 'GET'} ${request.baseUrl} took ${duration}ms (threshold: ${threshold}ms)`,
        { request, duration }
      );
    }

    return response;
  };
};

/**
 * Built-in middleware for request mutation tracking
 * Logs when requests are modified by other middleware
 */
export const requestMutationMiddleware = (): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    const original = JSON.stringify(request);
    const response = await next(request);
    const current = JSON.stringify(request);

    if (original !== current) {
      console.debug('[Service] Request was mutated by middleware', {
        original: JSON.parse(original),
        current: JSON.parse(current),
      });
    }

    return response;
  };
};

/**
 * Built-in middleware for response caching hint
 * Tracks cache hits/misses for monitoring
 */
export const cacheTrackingMiddleware = (): Middleware<RequestConfig, ServiceResponse> => {
  const cacheHits = new Map<string, number>();
  const cacheMisses = new Map<string, number>();

  return async (request, next) => {
    const cacheKey = `${request.method}:${request.baseUrl}`;

    // This would be set by the HTTP service if cache was hit
    // For now, just track that the request was made
    if (!cacheMisses.has(cacheKey)) {
      cacheMisses.set(cacheKey, 0);
    }
    cacheMisses.set(cacheKey, (cacheMisses.get(cacheKey) || 0) + 1);

    const response = await next(request);
    return response;
  };
};

/**
 * Built-in middleware for request header augmentation
 * Adds custom headers, auth tokens, correlation IDs, etc.
 */
export const headerAugmentationMiddleware = (
  augment: (request: RequestConfig) => Record<string, string>
): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    const additionalHeaders = augment(request);
    request.headers = {
      ...request.headers,
      ...additionalHeaders,
    };
    return next(request);
  };
};

/**
 * Built-in middleware for error retry with exponential backoff
 * Attempts to retry failed requests with increasing delays
 */
export const retryMiddleware = (
  maxRetries = 3,
  initialDelay = 100
): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    let lastError: Error | null = null;
    let delay = initialDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await next(request);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries - 1) {
          console.debug(
            `[Service] Retry attempt ${attempt + 1}/${maxRetries - 1} after ${delay}ms`,
            { request, error }
          );

          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(delay * 2, 10000); // Exponential backoff, max 10s
        }
      }
    }

    throw lastError;
  };
};

/**
 * Built-in middleware for circuit breaker pattern
 * Fails fast after repeated failures to prevent cascading errors
 */
export const circuitBreakerMiddleware = (
  failureThreshold = 5,
  resetTimeout = 60000
): Middleware<RequestConfig, ServiceResponse> => {
  let failureCount = 0;
  let lastFailureTime = 0;
  let isOpen = false;

  return async (request, next) => {
    const now = Date.now();

    // Reset if enough time has passed
    if (isOpen && now - lastFailureTime > resetTimeout) {
      isOpen = false;
      failureCount = 0;
      console.log('[Service] Circuit breaker reset');
    }

    if (isOpen) {
      throw new Error(
        `Circuit breaker is open for ${request.baseUrl}. Failing fast. Reset in ${resetTimeout - (now - lastFailureTime)}ms`
      );
    }

    try {
      const response = await next(request);
      // Success - reset failure count
      failureCount = 0;
      return response;
    } catch (error) {
      failureCount++;
      lastFailureTime = now;

      if (failureCount >= failureThreshold) {
        isOpen = true;
        console.error(
          `[Service] Circuit breaker opened after ${failureCount} failures for ${request.baseUrl}`
        );
      }

      throw error;
    }
  };
};

/**
 * Create a middleware that composes multiple middlewares into one
 * Useful for applying a group of related middlewares
 */
export const composeMiddleware = (
  middlewares: Array<Middleware<RequestConfig, ServiceResponse>>
): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    let index = 0;

    const composedNext = async (req: RequestConfig): Promise<ServiceResponse> => {
      if (index >= middlewares.length) {
        return next(req);
      }

      const middleware = middlewares[index++];
      return middleware(req, composedNext);
    };

    return composedNext(request);
  };
};

/**
 * Preset: Standard middleware stack for production
 * Includes logging, error handling, and performance monitoring
 */
export const productionMiddlewareStack = (): Middleware<RequestConfig, ServiceResponse> => {
  return composeMiddleware([
    loggingMiddleware('[HTTP]'),
    timeoutWarningMiddleware(5000),
    circuitBreakerMiddleware(5, 60000),
  ]);
};

/**
 * Preset: Development middleware stack
 * Includes verbose logging and mutation tracking
 */
export const developmentMiddlewareStack = (): Middleware<RequestConfig, ServiceResponse> => {
  return composeMiddleware([
    loggingMiddleware('[HTTP]'),
    timeoutWarningMiddleware(1000),
    requestMutationMiddleware(),
    cacheTrackingMiddleware(),
  ]);
};
