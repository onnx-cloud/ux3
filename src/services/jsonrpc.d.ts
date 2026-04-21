/**
 * JSON-RPC Service
 * JSON-RPC 2.0 protocol implementation for RPC calls
 */
import { Service } from './base.js';
import type { JSONRPCRequest } from './types.js';
export declare class JSONRPCService extends Service<JSONRPCRequest, any> {
    private http;
    private requestId;
    private pendingRequests;
    constructor(config: any);
    /**
     * Call RPC method
     */
    call<T = any>(method: string, params?: any, timeout?: number): Promise<T>;
    /**
     * Call RPC method (notification - no response)
     */
    notify(method: string, params?: any): Promise<void>;
    /**
     * Batch requests
     */
    batch<T = any>(requests: Array<{
        method: string;
        params?: any;
    }>, _timeout?: number): Promise<T[]>;
    /**
     * Fetch via JSON-RPC
     */
    fetch(request: JSONRPCRequest): Promise<any>;
    /**
     * Execute RPC request
     */
    private executeRequest;
    /**
     * Generate unique request ID
     */
    private generateId;
}
