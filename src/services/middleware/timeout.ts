import type { Middleware } from '../types.js';
import { ServiceErrorCode, ServiceError } from '../types.js';

export const timeoutMiddleware = (timeoutMs?: number): Middleware => {
  return async (request, next) => {
    const timeout = timeoutMs || 30000;

    if (typeof AbortSignal.timeout === 'function') {
      const signal = AbortSignal.timeout(timeout);

      const promise = next(request);
      const abortPromise = new Promise<never>((_, reject) => {
        const onAbort = () => {
          reject(new ServiceError(
            `Request timed out after ${timeout}ms`,
            ServiceErrorCode.TIMEOUT,
            { retryable: true }
          ));
        };
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });

      try {
        return await Promise.race([promise, abortPromise]);
      } finally {
        signal.removeEventListener('abort', () => {});
      }
    }

    return Promise.race([
      next(request),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new ServiceError(
            `Request timed out after ${timeout}ms`,
            ServiceErrorCode.TIMEOUT,
            { retryable: true }
          )),
          timeout
        )
      ),
    ]);
  };
};
