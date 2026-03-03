/**
 * Service Testing Utilities
 * Mock services, request/response recording, and service testing helpers
 */

import type { Middleware, RequestConfig, ServiceResponse } from '@ux3/ux3/services';

/**
 * Mock HTTP service for testing
 */
export class MockHttpService {
  private responses: Map<string, ServiceResponse> = new Map();
  private requestLog: RequestConfig[] = [];
  private callCount = 0;

  /**
   * Register mock response for URL
   */
  mockResponse(
    methodAndUrl: string,
    response: ServiceResponse
  ): this {
    this.responses.set(methodAndUrl, response);
    return this;
  }

  /**
   * Perform mock fetch
   */
  async fetch(request: RequestConfig): Promise<ServiceResponse> {
    this.callCount++;
    this.requestLog.push(request);

    const key = `${request.method || 'GET'}:${request.baseUrl}`;
    const response = this.responses.get(key);

    if (!response) {
      throw new Error(
        `No mock response registered for ${key}. Registered: ${Array.from(this.responses.keys()).join(', ')}`
      );
    }

    return response;
  }

  /**
   * Get call count
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Get request history
   */
  getRequests(): RequestConfig[] {
    return [...this.requestLog];
  }

  /**
   * Assert was called
   */
  assertWasCalled(
    methodAndUrl: string,
    times: number = 1
  ): void {
    const calls = this.requestLog.filter(
      (r) => `${r.method || 'GET'}:${r.baseUrl}` === methodAndUrl
    );

    if (calls.length !== times) {
      throw new Error(
        `Expected ${methodAndUrl} to be called ${times} times, was called ${calls.length} times`
      );
    }
  }

  /**
   * Clear mock state
   */
  reset(): void {
    this.responses.clear();
    this.requestLog = [];
    this.callCount = 0;
  }
}

/**
 * Mock JSON-RPC service for testing
 */
export class MockJSONRPCService {
  private methodHandlers: Map<string, Function> = new Map();
  private callLog: Array<{ method: string; params: any; result: any }> = [];

  /**
   * Register mock method handler
   */
  mockMethod(
    methodName: string,
    handler: (params: any) => Promise<any>
  ): this {
    this.methodHandlers.set(methodName, handler);
    return this;
  }

  /**
   * Call mock method
   */
  async call(method: string, params?: any): Promise<any> {
    const handler = this.methodHandlers.get(method);

    if (!handler) {
      throw new Error(
        `No handler registered for method: ${method}. Registered: ${Array.from(this.methodHandlers.keys()).join(', ')}`
      );
    }

    const result = await handler(params);
    this.callLog.push({ method, params, result });
    return result;
  }

  /**
   * Get call history
   */
  getCallHistory(): typeof this.callLog {
    return [...this.callLog];
  }

  /**
   * Assert method was called
   */
  assertWasCalled(method: string, times: number = 1): void {
    const calls = this.callLog.filter((c) => c.method === method);

    if (calls.length !== times) {
      throw new Error(
        `Expected method '${method}' to be called ${times} times, was called ${calls.length} times`
      );
    }
  }

  /**
   * Clear mock state
   */
  reset(): void {
    this.methodHandlers.clear();
    this.callLog = [];
  }
}

/**
 * Service call recorder middleware
 * Records all requests and responses for inspection
 */
export class ServiceCallRecorder {
  private calls: Array<{
    timestamp: number;
    request: any;
    response: any;
    duration: number;
    error?: Error;
  }> = [];

  /**
   * Create recording middleware
   */
  createMiddleware(): Middleware<RequestConfig, ServiceResponse> {
    return async (request, next) => {
      const start = Date.now();

      try {
        const response = await next(request);
        const duration = Date.now() - start;

        this.calls.push({
          timestamp: start,
          request,
          response,
          duration,
        });

        return response;
      } catch (error) {
        const duration = Date.now() - start;

        this.calls.push({
          timestamp: start,
          request,
          response: undefined,
          duration,
          error: error as Error,
        });

        throw error;
      }
    };
  }

  /**
   * Get all recorded calls
   */
  getCalls(): typeof this.calls {
    return [...this.calls];
  }

  /**
   * Get calls for specific method
   */
  getCallsFor(method: string): typeof this.calls {
    return this.calls.filter((c) => c.request.method === method);
  }

  /**
   * Get call count
   */
  getCallCount(): number {
    return this.calls.length;
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(): number {
    if (this.calls.length === 0) return 0;
    const total = this.calls.reduce((sum, c) => sum + c.duration, 0);
    return total / this.calls.length;
  }

  /**
   * Assert request pattern
   */
  assertRequestMade(
    method: string,
    urlPattern?: RegExp
  ): void {
    const found = this.calls find(
      (c) =>
        c.request.method === method &&
        (!urlPattern || urlPattern.test(c.request.baseUrl || ''))
    );

    if (!found) {
      throw new Error(
        `No request found for ${method} ${urlPattern?.source || '*'}`
      );
    }
  }

  /**
   * Clear recordings
   */
  reset(): void {
    this.calls = [];
  }
}

/**
 * Service error simulator
 * Simulate service failures for error path testing
 */
export class ServiceErrorSimulator {
  private failureConfig: Map<string, { errorMessage: string; afterAttempts: number }> =
    new Map();

  private attemptCounts: Map<string, number> = new Map();

  /**
   * Configure service to fail
   */
  configureFailure(
    serviceMethod: string,
    errorMessage: string,
    afterAttempts: number = 0
  ): this {
    this.failureConfig.set(serviceMethod, {
      errorMessage,
      afterAttempts,
    });
    return this;
  }

  /**
   * Create error injection middleware
   */
  createMiddleware(): Middleware<RequestConfig, ServiceResponse> {
    return async (request, next) => {
      const key = `${request.method}:${request.baseUrl}`;
      const config = this.failureConfig.get(key);

      if (config) {
        const attemptCount = (this.attemptCounts.get(key) || 0) + 1;
        this.attemptCounts.set(key, attemptCount);

        if (attemptCount > config.afterAttempts) {
          throw new Error(config.errorMessage);
        }
      }

      return next(request);
    };
  }

  /**
   * Clear configuration
   */
  reset(): void {
    this.failureConfig.clear();
    this.attemptCounts.clear();
  }
}

/**
 * Spy on service calls
 */
export class ServiceSpy {
  private originalMethods: Map<string, Function> = new Map();
  private callCounts: Map<string, number> = new Map();
  private callArguments: Map<string, any[][]> = new Map();

  /**
   * Spy on service method
   */
  spyOn(
    service: any,
    methodName: string,
    original?: Function
  ): this {
    const actualMethod = original || service[methodName];

    this.originalMethods.set(methodName, actualMethod);
    this.callCounts.set(methodName, 0);
    this.callArguments.set(methodName, []);

    service[methodName] = async (...args: any[]) => {
      const counts = this.callCounts.get(methodName) || 0;
      this.callCounts.set(methodName, counts + 1);

      const argsArray = this.callArguments.get(methodName) || [];
      argsArray.push(args);
      this.callArguments.set(methodName, argsArray);

      return actualMethod.apply(service, args);
    };

    return this;
  }

  /**
   * Get call count
   */
  getCallCount(methodName: string): number {
    return this.callCounts.get(methodName) || 0;
  }

  /**
   * Get call arguments
   */
  getCallArguments(methodName: string): any[][] {
    return this.callArguments.get(methodName) || [];
  }

  /**
   * Assert called with arguments
   */
  assertCalledWith(
    methodName: string,
    expectedArgs: any[]
  ): void {
    const calls = this.callArguments.get(methodName) || [];
    const found = calls.some(
      (args) =>
        JSON.stringify(args) === JSON.stringify(expectedArgs)
    );

    if (!found) {
      throw new Error(
        `Method '${methodName}' not called with expected arguments.\nExpected: ${JSON.stringify(expectedArgs)}\nActual calls: ${JSON.stringify(calls)}`
      );
    }
  }

  /**
   *Restore original methods
   */
  restore(): void {
    // Would need reference to service to restore
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.callCounts.clear();
    this.callArguments.clear();
  }
}
