import type { Middleware } from '../types.js';

export const deduplicationMiddleware = (): Middleware => {
  const inFlight = new Map<string, Promise<unknown>>();

  return async (request, next) => {
    const key = buildDedupKey(request);
    const existing = inFlight.get(key);
    if (existing) return existing;

    const promise = next(request).finally(() => {
      inFlight.delete(key);
    });

    inFlight.set(key, promise);
    return promise;
  };
};

function buildDedupKey(request: unknown): string {
  if (request == null) return 'null';
  if (typeof request === 'string') return request;
  if (typeof request === 'object') {
    const r = request as Record<string, unknown>;
    const method = r.method || '';
    const url = r.baseUrl || r.url || '';
    const body = r.data ? JSON.stringify(r.data) : '';
    return `${method}:${url}:${body}`;
  }
  return String(request);
}
