/**
 * JSON-RPC Service
 * JSON-RPC 2.0 protocol implementation for RPC calls
 */

import { Service } from './base.js';
import type { JSONRPCRequest, JSONRPCResponse } from './types.js';

export class JSONRPCService extends Service<JSONRPCRequest, any> {
  private http: any;
  private requestId = 0;
  private pendingRequests = new Map<
    string | number,
    { resolve: (value: any) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }
  >();

  constructor(config: any) {
    super(config);
    // Use HTTPService for transport
    const { HTTPService: HTTP } = require('./http.js');
    this.http = new HTTP(config);
  }

  /**
   * Call RPC method
   */
  async call<T = any>(
    method: string,
    params?: any,
    timeout: number = this.config.timeout || 30000
  ): Promise<T> {
    const id = this.generateId();
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id,
    };

    return this.executeRequest<T>(request, timeout);
  }

  /**
   * Call RPC method (notification - no response)
   */
  async notify(method: string, params?: any): Promise<void> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
    };

    // Notifications don't have id and don't expect response
    await this.http.post(this.config.baseUrl, request).catch(() => {
      // Ignore errors for notifications
    });
  }

  /**
   * Batch requests
   */
  async batch<T = any>(
    requests: Array<{ method: string; params?: any }>,
    _timeout?: number
  ): Promise<T[]> {
    const rpcRequests: JSONRPCRequest[] = requests.map(({ method, params }) => ({
      jsonrpc: '2.0',
      method,
      params,
      id: this.generateId(),
    }));

    const response = await this.http.post(this.config.baseUrl, rpcRequests);

    if (!response.ok) {
      throw new Error(`RPC batch request failed: ${response.status}`);
    }

    const responses: JSONRPCResponse[] = response.data;
    return responses.map(r => {
      if (r.error) {
        throw new Error(r.error.message);
      }
      return r.result;
    }) as T[];
  }

  /**
   * Fetch via JSON-RPC
   */
  async fetch(request: JSONRPCRequest): Promise<any> {
    return this.executeRequest(request);
  }

  /**
   * Execute RPC request
   */
  private async executeRequest<T = any>(
    request: JSONRPCRequest,
    timeout: number = this.config.timeout || 30000
  ): Promise<T> {
    // Use timeout parameter to avoid unused warning
    void timeout;
    return new Promise((resolve, reject) => {
      const requestTimeout = setTimeout(() => {
        if (request.id) {
          this.pendingRequests.delete(request.id);
        }
        reject(new Error('RPC request timeout'));
      }, timeout);

      if (request.id) {
        this.pendingRequests.set(request.id, {
          resolve,
          reject,
          timeout: requestTimeout,
        });
      }

      // Send request via HTTP
      this.http
        .post(this.config.baseUrl, request)
        .then((response: any) => {
          if (!response.ok) {
            throw new Error(`RPC request failed: ${response.status}`);
          }

          const rpcResponse: JSONRPCResponse<T> = response.data;

          if (rpcResponse.error) {
            reject(new Error(rpcResponse.error.message));
          } else {
            resolve(rpcResponse.result as T);
          }

          clearTimeout(requestTimeout);
          if (request.id) {
            this.pendingRequests.delete(request.id);
          }
        })
        .catch((error: Error) => {
          clearTimeout(requestTimeout);
          if (request.id) {
            this.pendingRequests.delete(request.id);
          }
          reject(error);
        });
    });
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string | number {
    return ++this.requestId;
  }
}
