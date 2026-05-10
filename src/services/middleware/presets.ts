import { composeMiddleware } from './compose.js';
import { requestIdMiddleware } from './request-id.js';
import { loggingMiddleware } from './logging.js';
import { timeoutMiddleware } from './timeout.js';
import { retryMiddleware } from './retry.js';
import { circuitBreakerMiddleware } from './circuit-breaker.js';
import { sanitizeResponseMiddleware } from './sanitize.js';
import type { Middleware } from '../types.js';

export function productionMiddlewareStack(prefix = '[HTTP]'): Middleware {
  return composeMiddleware([
    requestIdMiddleware(),
    loggingMiddleware(prefix),
    timeoutMiddleware(),
    sanitizeResponseMiddleware(),
    circuitBreakerMiddleware({ failureThreshold: 5, resetTimeoutMs: 60_000 }),
    retryMiddleware({ maxRetries: 3, initialDelay: 1000, maxDelay: 30_000 }),
  ]);
}

export function developmentMiddlewareStack(prefix = '[HTTP]'): Middleware {
  return composeMiddleware([
    requestIdMiddleware(),
    loggingMiddleware(prefix),
    timeoutMiddleware(10_000),
    sanitizeResponseMiddleware(),
    retryMiddleware({ maxRetries: 1, initialDelay: 500 }),
  ]);
}

export function testMiddlewareStack(): Middleware {
  return composeMiddleware([
    requestIdMiddleware(),
    sanitizeResponseMiddleware(),
  ]);
}
