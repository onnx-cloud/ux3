import type { InvokeCache } from '../invoke-cache.js';
import type { Middleware } from '../types.js';

export const staleWhileRevalidateMiddleware = (
  cache: InvokeCache,
  options?: { defaultTTL?: number; maxStaleMs?: number }
): Middleware => {
  return async (request, next) => {
    const key = buildCacheKey(request);
    const result = cache.staleWhileRevalidate(key, () => next(request), {
      ttl: options?.defaultTTL,
      maxStaleMs: options?.maxStaleMs,
    });

    const resolved = await result;
    return resolved.data;
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
