import type { InvokeCache } from '../invoke-cache.js';
import type { Middleware } from '../types.js';

export const cacheMiddleware = (cache: InvokeCache, options?: { defaultTTL?: number }): Middleware => {
  return async (request, next) => {
    const key = buildCacheKey(request);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const response = await next(request);
    cache.set(key, response, { ttl: options?.defaultTTL });
    return response;
  };
};

function buildCacheKey(request: unknown): string {
  if (request == null) return 'null';
  if (typeof request === 'object') {
    const r = request as Record<string, unknown>;
    return `${r.service || ''}.${r.method || ''}:${JSON.stringify(r.input || r.params || '')}`;
  }
  return String(request);
}
