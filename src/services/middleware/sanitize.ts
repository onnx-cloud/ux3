import type { Middleware } from '../types.js';

export const sanitizeResponseMiddleware = (options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
}): Middleware => {
  return async (request, next) => {
    const response = await next(request);

    if (response && typeof response === 'object') {
      return sanitizeObject(response, new WeakSet());
    }

    return response;
  };
};

function sanitizeObject(obj: unknown, seen: WeakSet<object>): unknown {
  if (obj == null || typeof obj !== 'object') return obj;
  if (seen.has(obj as object)) return obj;
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = sanitizeObject(value, seen);
  }
  return result;
}
