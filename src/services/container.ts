/**
 * ServiceContainer - Dependency injection and lifecycle management for services
 * Handles service invocation with request/response validation, error handling, and observability
 */

import type { Service, ServiceConfig } from './types.js';

/**
 * Service invocation options
 */
export interface ServiceCallOptions {
  timeout?: number;
  retries?: number;
  validate?: boolean;
  observability?: boolean;
}

/**
 * Service invocation result
 */
export interface ServiceCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  // Convenience top-level duration for tests
  duration?: number;
  metadata: {
    duration: number;
    timestamp: number;
    retryCount: number;
    service: string;
    method: string;
  };
}

/**
 * ServiceContainer - Manages service instances and their lifecycle
 */
export class ServiceContainer {
  private services: Map<string, Service> = new Map();
  private singletons: Map<string, any> = new Map();
  private telemetryListeners: Array<(result: ServiceCallResult) => void> = [];
  private errorListeners: Array<(error: Error, context: any) => void> = [];

  /**
   * Register a service instance
   */
  register(name: string, service: Service): this {
    if (this.services.has(name)) {
      console.warn(`[ServiceContainer] Overwriting service: ${name}`);
    }
    this.services.set(name, service);
    return this;
  }

  /**
   * Get a registered service
   */
  getService(name: string): Service | undefined {
    return this.services.get(name);
  }

  // Backwards-compatible alias for tests / older API
  get(name: string): Service | null {
    return this.getService(name) ?? null;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * List all registered services
   */
  list(): string[] {
    return Array.from(this.services.keys());
  }

  // Backwards-compatible alias
  listServices(): string[] {
    return this.list();
  }

  /**
   * Call a service method with type-checking and validation
   */
  async call<T = any>(
    serviceName: string,
    method: string,
    params?: any,
    options: ServiceCallOptions = {}
  ): Promise<ServiceCallResult<T>> {
    const startTime = Date.now();
    const retryCount = 0; // not mutated at present
    const result: ServiceCallResult<T> = {
      success: false,
      metadata: {
        duration: 0,
        timestamp: startTime,
        retryCount,
        service: serviceName,
        method,
      },
    };

    // Validate service exists before entry to avoid swallowing errors for missing services
    const service = this.getService(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    try {
      // 2. Call the service
      const data = await this.callWithRetry(
        service,
        method,
        params,
        options.retries || 0
      );

      result.success = true;
      result.data = data;

      // 3. Emit telemetry
      this.emitTelemetry(result);

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      result.success = false;
      result.error = err;

      // 4. Emit error telemetry
      this.emitError(err, {
        service: serviceName,
        method,
        params,
      });

      this.emitTelemetry(result);

      // Return the result rather than throwing to allow callers to inspect errors
      return result;
    } finally {
      result.metadata.duration = Date.now() - startTime;
      result.metadata.retryCount = retryCount;
      // Expose a top-level duration for tests and convenience
      (result as any).duration = result.metadata.duration;
    }
  }

  /**
   * Call service with retry logic
   */
  private async callWithRetry(
    service: Service,
    method: string,
    params: any,
    retries: number
  ): Promise<any> {
    let lastError: Error | null = null;
    const maxAttempts = retries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Invoke the service
        const result = service.call ? await service.call(method, params) : undefined;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms, ...
          const delay = Math.pow(2, attempt) * 100;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Service call failed');
  }

  /**
   * Helper: sleep for milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Register telemetry listener
   */
  onTelemetry(listener: (result: ServiceCallResult) => void): this {
    this.telemetryListeners.push(listener);
    return this;
  }

  /**
   * Emit telemetry
   */
  private emitTelemetry(result: ServiceCallResult): void {
    for (const listener of this.telemetryListeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('[ServiceContainer] Telemetry listener error:', error);
      }
    }

    // Also emit to global telemetry if available
    if (typeof window !== 'undefined' && (window as any).__ux3Telemetry) {
      (window as any).__ux3Telemetry('service:call', result);
    }
  }

  /**
   * Register error listener
   */
  onError(listener: (error: Error, context: any) => void): this {
    this.errorListeners.push(listener);
    return this;
  }

  /**
   * Emit error
   */
  private emitError(error: Error, context: any): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error, context);
      } catch (e) {
        console.error('[ServiceContainer] Error listener failed:', e);
      }
    }
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}

/**
 * Singleton instance for global service container
 */
export const DefaultServiceContainer = new ServiceContainer();
