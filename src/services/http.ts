/**
 * HTTP Service
 * HTTP/HTTPS data adapter with caching, auth, and retry
 */

import { Service } from './base.js';
import type { RequestConfig, ServiceResponse } from './types.js';

export class HTTPService extends Service<RequestConfig, any> {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 60000; // 1 minute

  /**
   * Fetch data via HTTP
   */
  async fetch(request: RequestConfig): Promise<any> {
    const cacheKey = this.getCacheKey(request);

    // Check cache
    if (request.method === 'GET' && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    // Execute with middlewares and retry
    return this.withRetry(() =>
      this.executeMiddlewares({
        ...request,
        method: request.method || 'GET',
      })
    );
  }

  /**
   * Perform HTTP request
   */
  async request<T = any>(config: RequestConfig): Promise<ServiceResponse<T>> {
    const url = this.buildUrl(config);
    const options = this.buildFetchOptions(config);

    try {
      const response = await this.withTimeout(
        fetch(url, options),
        config.timeout
      );

      const data = await this.parseResponse(response);
      const result: ServiceResponse<T> = {
        method: options.method || 'GET',
        ok: response.ok,
        status: response.status,
        data: data as T,
      };

      // Cache successful GET requests
      if (config.method === 'GET' && response.ok) {
        this.cache.set(this.getCacheKey(config), {
          data: result.data,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (error) {
      return {
        method: options.method || 'request',
        ok: false,
        status: 0,
        data: null as any,
        error: error as Error,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', baseUrl: url });
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({
      ...config,
      method: 'POST',
      baseUrl: url,
      data,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({
      ...config,
      method: 'PUT',
      baseUrl: url,
      data,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', baseUrl: url });
  }

  /**
   * Build full URL
   */
  private buildUrl(config: RequestConfig): string {
    const baseUrl = config.baseUrl || this.config.baseUrl || '';
    const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : '');

    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Build fetch options
   */
  private buildFetchOptions(config: RequestConfig): RequestInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...config.headers,
    };

    // Add auth token if provided
    if (config.auth?.token) {
      headers['Authorization'] = `Bearer ${config.auth.token}`;
    }

    const options: RequestInit = {
      method: config.method || 'GET',
      headers,
    };

    // Add body for POST/PUT/PATCH
    if (config.data && ['POST', 'PUT', 'PATCH'].includes(config.method || 'GET')) {
      options.body =
        typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    }

    return options;
  }

  /**
   * Parse response
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text')) {
      return response.text();
    } else {
      return response.blob();
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(config: RequestConfig): string {
    return `${config.method || 'GET'}:${config.baseUrl}:${JSON.stringify(config.params || {})}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(ms: number): void {
    this.cacheTimeout = ms;
  }
}

// Backwards compatibility: export a class alias for environments that expect a class constructor
export class HttpService extends HTTPService {}