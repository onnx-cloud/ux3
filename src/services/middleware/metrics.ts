import type { Middleware } from '../types.js';

export const metricsMiddleware = (options: {
  onRecord?: (service: string, method: string, duration: number, success: boolean) => void;
} = {}): Middleware => {
  return async (request, next) => {
    const start = Date.now();
    const serviceName = ((request as Record<string, unknown>).service as string) || 'unknown';
    const methodName = ((request as Record<string, unknown>).method as string) || 'unknown';

    try {
      const response = await next(request);
      options.onRecord?.(serviceName, methodName, Date.now() - start, true);
      return response;
    } catch (error) {
      options.onRecord?.(serviceName, methodName, Date.now() - start, false);
      throw error;
    }
  };
};
