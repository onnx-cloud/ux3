import type { Middleware, RequestConfig, ServiceResponse } from './types.js';

export type { Middleware } from './types.js';

export interface LogContext {
  timestamp: number;
  method: string;
  url?: string;
  status?: number;
  duration?: number;
  error?: Error;
}

export { requestIdMiddleware } from './middleware/request-id.js';
export { loggingMiddleware } from './middleware/logging.js';
export { rateLimitMiddleware } from './middleware/rate-limit.js';
export { sanitizeResponseMiddleware } from './middleware/sanitize.js';
export { metricsMiddleware } from './middleware/metrics.js';
export { timeoutMiddleware } from './middleware/timeout.js';
export { retryMiddleware as retryMiddleware_ } from './middleware/retry.js';
export { circuitBreakerMiddleware } from './middleware/circuit-breaker.js';
export { deduplicationMiddleware } from './middleware/dedup.js';
export { cacheMiddleware } from './middleware/cache.js';
export { staleWhileRevalidateMiddleware } from './middleware/swr.js';
export { authMiddleware, AuthProvider } from './middleware/auth.js';
export { composeMiddleware } from './middleware/compose.js';
export {
  productionMiddlewareStack,
  developmentMiddlewareStack,
  testMiddlewareStack,
} from './middleware/presets.js';

export const timeoutWarningMiddleware = (threshold = 5000): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    const startTime = Date.now();
    const response = await next(request);
    const duration = Date.now() - startTime;
    if (duration > threshold) {
      console.warn(`[Service] Slow request: ${request.method || 'GET'} ${request.baseUrl} took ${duration}ms`);
    }
    return response;
  };
};

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

export const cacheTrackingMiddleware = (): Middleware<RequestConfig, ServiceResponse> => {
  return async (request, next) => {
    return next(request);
  };
};

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

export function retryMiddleware(
  maxRetries: number = 3,
  initialDelay: number = 100
): Middleware<RequestConfig, ServiceResponse> {
  return async (request, next) => {
    let lastError: Error | null = null;
    let delay = initialDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await next(request);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          console.debug(`[Service] Retry attempt ${attempt + 1}/${maxRetries - 1} after ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(delay * 2, 10000);
        }
      }
    }

    throw lastError;
  };
}

