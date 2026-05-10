import type { Middleware } from '../types.js';

const REDACTED_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-csrf-token', 'set-cookie'];
const REDACTED_FIELDS = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(v => redact(v, depth + 1));
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (REDACTED_HEADERS.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (REDACTED_FIELDS.includes(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redact(value, depth + 1);
      }
    }
    return result;
  }
  return obj;
}

export const loggingMiddleware = (prefix = '[Service]'): Middleware => {
  return async (request, next) => {
    const start = Date.now();
    try {
      const response = await next(request);
      const duration = Date.now() - start;
      console.debug(`${prefix} ${(request as Record<string, unknown>).method || 'request'} ${(request as Record<string, unknown>).baseUrl || ''} - ${duration}ms`, {
        request: redact(request),
        response: redact(response),
      });
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`${prefix} ${(request as Record<string, unknown>).method || 'request'} ${(request as Record<string, unknown>).baseUrl || ''} - ERROR after ${duration}ms`, {
        request: redact(request),
        error,
      });
      throw error;
    }
  };
};
