import { BaseServiceAdapter } from './base.js';
import type { RequestConfig, ServiceResponse, ServiceConfig } from './types.js';
import { ServiceError, ServiceErrorCode } from './types.js';

export interface HttpServiceConfig extends ServiceConfig {
  auth?: { scheme: 'bearer'; token: string } | { scheme: 'basic'; username: string; password: string };
  csrf?: { headerName: string; cookieName: string };
  maxRedirects?: number;
  maxBodySize?: number;
  validateResponse?: (data: unknown) => boolean;
}

export class HTTPService extends BaseServiceAdapter<RequestConfig, unknown> {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTimeout = 60_000;
  private maxBodySize: number;

  constructor(config: HttpServiceConfig = {}) {
    super('http', config);
    this.maxBodySize = (config as HttpServiceConfig).maxBodySize ?? 10 * 1024 * 1024;
  }

  async transport(request: RequestConfig, signal?: AbortSignal): Promise<unknown> {
    const cacheKey = this.getCacheKey(request);
    if (request.method === 'GET' && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    return this.withRetry(() => this.performRequest(request, signal));
  }

  async execute(request: RequestConfig, signal?: AbortSignal): Promise<unknown> {
    return this.executeMiddlewares(request, signal);
  }

  async fetch(request: RequestConfig): Promise<unknown> {
    return this.execute(request);
  }

  private async performRequest(config: RequestConfig, signal?: AbortSignal): Promise<unknown> {
    const url = this.buildUrl(config);
    const cacheKey = this.getCacheKey(config);
    const options = this.buildFetchOptions(config, signal);

    const response = await this.withTimeout(
      fetch(url, options),
      config.timeout ?? this.config.timeout
    );

    if (response.status >= 400) {
      const code = response.status === 401 ? ServiceErrorCode.UNAUTHORIZED
        : response.status === 403 ? ServiceErrorCode.FORBIDDEN
        : response.status === 404 ? ServiceErrorCode.NOT_FOUND
        : response.status === 429 ? ServiceErrorCode.RATE_LIMITED
        : ServiceErrorCode.UNKNOWN;

      throw new ServiceError(
        `HTTP ${response.status}: ${response.statusText}`,
        code,
        { status: response.status, retryable: response.status === 429 || response.status >= 500 }
      );
    }

    const data = await this.parseResponse(response);

    if (this.maxBodySize > 0) {
      const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
      if (new Blob([bodyStr]).size > this.maxBodySize) {
        throw new ServiceError(
          `Response body exceeds max size of ${this.maxBodySize} bytes`,
          ServiceErrorCode.VALIDATION,
          { status: response.status }
        );
      }
    }

    if (config.method === 'GET' && response.ok) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  }

  async request<T = unknown>(config: RequestConfig): Promise<ServiceResponse<T>> {
    try {
      const data = await this.execute(config);
      return {
        method: config.method || 'GET',
        ok: true,
        status: 200,
        data: data as T,
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        return {
          method: config.method || 'request',
          ok: false,
          status: error.status || 0,
          data: null as unknown as T,
          error,
        };
      }
      return {
        method: config.method || 'request',
        ok: false,
        status: 0,
        data: null as unknown as T,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async get<T = unknown>(url: string, config?: RequestConfig): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', baseUrl: url });
  }

  async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', baseUrl: url, data });
  }

  async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', baseUrl: url, data });
  }

  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', baseUrl: url });
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ServiceResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', baseUrl: url, data });
  }

  private buildUrl(config: RequestConfig): string {
    const baseUrl = config.baseUrl || this.config.baseUrl || '';
    if (!baseUrl) throw new ServiceError('No baseUrl configured', ServiceErrorCode.VALIDATION);

    const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private buildFetchOptions(config: RequestConfig, signal?: AbortSignal): RequestInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.headers || {}),
      ...(config.headers || {}),
    };

    if (config.auth?.token) {
      headers['Authorization'] = `Bearer ${config.auth.token}`;
    }

    const options: RequestInit = {
      method: config.method || 'GET',
      headers,
    };

    if (signal) {
      options.signal = signal;
    }

    if (config.data && ['POST', 'PUT', 'PATCH'].includes(config.method || '')) {
      options.body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    }

    return options;
  }

  private async parseResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) return response.json();
    if (contentType?.includes('text')) return response.text();
    return response.blob();
  }

  private getCacheKey(config: RequestConfig): string {
    return `${config.method || 'GET'}:${config.baseUrl}:${JSON.stringify(config.params || {})}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  setCacheTimeout(ms: number): void {
    this.cacheTimeout = ms;
  }
}

export class HttpService extends HTTPService {}
