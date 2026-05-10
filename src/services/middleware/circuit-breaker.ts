import type { Middleware } from '../types.js';
import { ServiceErrorCode, ServiceError } from '../types.js';

export const circuitBreakerMiddleware = (options?: { failureThreshold?: number; resetTimeoutMs?: number } | number, resetTimeout?: number): Middleware => {
  let failureThreshold: number;
  let resetTimeoutMs: number;

  if (typeof options === 'number') {
    failureThreshold = options;
    resetTimeoutMs = resetTimeout ?? 60000;
  } else {
    failureThreshold = options?.failureThreshold ?? 5;
    resetTimeoutMs = options?.resetTimeoutMs ?? 60000;
  }

  let failureCount = 0;
  let lastFailureTime = 0;
  let isOpen = false;
  let halfOpen = false;

  return async (request, next) => {
    const now = Date.now();

    if (isOpen && now - lastFailureTime > resetTimeoutMs) {
      isOpen = false;
      halfOpen = true;
      failureCount = 0;
    }

    if (isOpen && !halfOpen) {
      throw new ServiceError(
        `Circuit breaker is open. Reset in ${resetTimeoutMs - (now - lastFailureTime)}ms`,
        ServiceErrorCode.CIRCUIT_OPEN,
        { retryable: true }
      );
    }

    try {
      const response = await next(request);
      if (halfOpen) {
        halfOpen = false;
        failureCount = 0;
      }
      failureCount = 0;
      return response;
    } catch (error) {
      failureCount++;
      lastFailureTime = now;

      if (halfOpen) {
        isOpen = true;
        halfOpen = false;
        throw new ServiceError(
          `Circuit breaker re-opened after half-open test failure`,
          ServiceErrorCode.CIRCUIT_OPEN,
          { retryable: true, cause: error instanceof Error ? error : undefined }
        );
      }

      if (failureCount >= failureThreshold) {
        isOpen = true;
        throw new ServiceError(
          `Circuit breaker opened after ${failureCount} failures`,
          ServiceErrorCode.CIRCUIT_OPEN,
          { retryable: true }
        );
      }

      throw error;
    }
  };
};
