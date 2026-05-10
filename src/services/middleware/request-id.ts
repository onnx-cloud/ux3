import type { Middleware } from '../types.js';

export const requestIdMiddleware = (): Middleware => {
  return async (request, next) => {
    const id = (request as Record<string, unknown>).requestId
      || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    (request as Record<string, unknown>).requestId = id;
    (request as Record<string, unknown>).headers = {
      ...((request as Record<string, unknown>).headers as Record<string, string> || {}),
      'x-request-id': String(id),
    };
    return next(request);
  };
};
