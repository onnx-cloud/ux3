/**
 * HTTP Service
 * HTTP/HTTPS data adapter with caching, auth, and retry
 */
import { Service } from './base.js';
import type { RequestConfig, ServiceResponse } from './types.js';
export declare class HTTPService extends Service<RequestConfig, any> {
    private cache;
    private cacheTimeout;
    /**
     * Fetch data via HTTP
     */
    fetch(request: RequestConfig): Promise<any>;
    /**
     * Perform HTTP request
     */
    request<T = any>(config: RequestConfig): Promise<ServiceResponse<T>>;
    /**
     * GET request
     */
    get<T = any>(url: string, config?: RequestConfig): Promise<ServiceResponse<T>>;
    /**
     * POST request
     */
    post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ServiceResponse<T>>;
    /**
     * PUT request
     */
    put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ServiceResponse<T>>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, config?: RequestConfig): Promise<ServiceResponse<T>>;
    /**
     * Build full URL
     */
    private buildUrl;
    /**
     * Build fetch options
     */
    private buildFetchOptions;
    /**
     * Parse response
     */
    private parseResponse;
    /**
     * Generate cache key
     */
    private getCacheKey;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Set cache timeout
     */
    setCacheTimeout(ms: number): void;
}
export declare class HttpService extends HTTPService {
}
