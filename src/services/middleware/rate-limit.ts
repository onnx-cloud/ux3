import type { Middleware } from '../types.js';

export const rateLimitMiddleware = (options: {
  windowMs?: number;
  max?: number;
} = {}): Middleware => {
  const windowMs = options.windowMs ?? 1000;
  const max = options.max ?? 50;
  const buckets = new Map<string, { tokens: number; lastRefill: number }>();

  return async (request, next) => {
    const key = (request as Record<string, unknown>).baseUrl as string
      || (request as Record<string, unknown>).url as string
      || 'default';
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { tokens: max, lastRefill: now };
      buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor(elapsed / windowMs) * max;
    bucket.tokens = Math.min(max, bucket.tokens + refill);
    bucket.lastRefill = now;

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return next(request);
    }

    const err: Error & { code?: string; retryable?: boolean } = new Error(`Rate limit exceeded for ${key}`);
    err.code = 'SVC_RATE_LIMITED';
    err.retryable = true;
    throw err;
  };
};
