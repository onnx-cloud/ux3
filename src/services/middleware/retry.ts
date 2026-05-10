import type { Middleware } from '../types.js';
import { ServiceErrorCode, ServiceError } from '../types.js';
import { sleep } from '../sleep.js';

export const retryMiddleware = (options?: {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}): Middleware => {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelay = options?.initialDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;

  return async (request, next) => {
    let lastError: Error | null = null;
    let delay = initialDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await next(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof ServiceError && !error.retryable) {
          throw error;
        }

        if (attempt < maxRetries - 1) {
          await sleep(delay + Math.random() * delay * 0.3);
          delay = Math.min(delay * 2, maxDelay);
        }
      }
    }

    throw lastError || new ServiceError(
      'Max retries exceeded',
      ServiceErrorCode.UNKNOWN,
      { retryable: false }
    );
  };
};
