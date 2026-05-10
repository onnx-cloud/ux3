import { BaseServiceAdapter } from './base.js';
import type { JSONRPCRequest, JSONRPCResponse, ServiceConfig } from './types.js';
import { ServiceError, ServiceErrorCode } from './types.js';
import { HTTPService } from './http.js';

export class JSONRPCService extends BaseServiceAdapter<JSONRPCRequest, unknown> {
  private http: HTTPService;
  private requestId = 0;
  private maxBatchSize: number;

  constructor(config: ServiceConfig = {}) {
    super('jsonrpc', config);
    this.http = new HTTPService(config);
    this.maxBatchSize = 20;
  }

  async transport(request: JSONRPCRequest, signal?: AbortSignal): Promise<unknown> {
    return this.executeRequest(request, this.config.timeout || 30000, signal);
  }

  async execute(request: JSONRPCRequest, signal?: AbortSignal): Promise<unknown> {
    return this.transport(request, signal);
  }

  async call<T = unknown>(method: string, params?: unknown, timeout?: number): Promise<T> {
    const id = this.generateId();
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id,
    };
    return this.executeRequest<T>(request, timeout ?? this.config.timeout ?? 30000);
  }

  async notify(method: string, params?: unknown): Promise<void> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.http.post(this.config.baseUrl, request).catch(() => {});
  }

  async batch<T = unknown>(requests: Array<{ method: string; params?: unknown }>): Promise<T[]> {
    if (requests.length > this.maxBatchSize) {
      throw new ServiceError(
        `Batch size ${requests.length} exceeds limit of ${this.maxBatchSize}`,
        ServiceErrorCode.VALIDATION
      );
    }

    const rpcRequests: JSONRPCRequest[] = requests.map(({ method, params }) => ({
      jsonrpc: '2.0' as const,
      method,
      params,
      id: this.generateId(),
    }));

    const response = await this.http.post(this.config.baseUrl, rpcRequests);

    if (!response.ok) {
      throw new ServiceError(
        `RPC batch request failed: ${response.status}`,
        ServiceErrorCode.UNKNOWN,
        { status: response.status }
      );
    }

    const responses = response.data as JSONRPCResponse[];
    return responses.map(r => {
      if (r.error) {
        throw new ServiceError(r.error.message, ServiceErrorCode.UNKNOWN);
      }
      return r.result;
    }) as T[];
  }

  async fetch(request: JSONRPCRequest): Promise<unknown> {
    return this.executeRequest(request, this.config.timeout || 30000);
  }

  private async executeRequest<T = unknown>(
    request: JSONRPCRequest,
    timeout: number,
    signal?: AbortSignal
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await this.http.post(this.config.baseUrl, request);

      if (!response.ok) {
        throw new ServiceError(
          `RPC request failed: ${response.status}`,
          ServiceErrorCode.UNKNOWN,
          { status: response.status }
        );
      }

      const rpcResponse = response.data as JSONRPCResponse<T>;

      if (rpcResponse.error) {
        throw new ServiceError(
          rpcResponse.error.message,
          ServiceErrorCode.UNKNOWN,
          { retryable: false }
        );
      }

      return rpcResponse.result as T;
    } catch (error) {
      if (controller.signal.aborted && !signal?.aborted) {
        throw new ServiceError('RPC request timeout', ServiceErrorCode.TIMEOUT, { retryable: true });
      }
      if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw new ServiceError('Request aborted', ServiceErrorCode.ABORTED);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${++this.requestId}`;
  }
}
