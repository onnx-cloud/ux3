/**
 * Service System Types
 * Abstraction layer for HTTP, WebSocket, and JSON-RPC communication
 */

export interface Middleware<T = any, R = any> {
  (request: T, next: (req: T) => Promise<R>): Promise<R>;
}

export interface ErrorHandler {
  (error: Error, retry: () => Promise<any>): Promise<any>;
}

export interface ServiceConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  autoConnect?: boolean;
  messageTimeout?: number;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface RequestConfig extends ServiceConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, any>;
  data?: any;
  auth?: { token: string };
}

export interface ResponseData<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface ServiceResponse<T = any> {
  method: string;
  status: number;
  data: T;
  ok?: boolean;
  error?: Error;
}

// alias used by websocket service to indicate unsubscribe function
export type SubscriptionUnsubscribe = Subscriber;

export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  id?: string | number;
}

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number;
}

export interface JSONRPCResponse<T = any> {
  jsonrpc: '2.0';
  result?: T;
  error?: { code: number; message: string; data?: any };
  id: string | number;
}

export interface SubscriptionHandler<T = any> {
  (data: T): void;
}

export type Service<T = any, R = any> = {
  fetch(request: T): Promise<R>;
  call?(method: string, params?: any): Promise<any>;
  update?(request: T): Promise<R>;
  find?(options?: Record<string,any>): Promise<R[]>;
  // WebSocket-style subscribe takes a topic and handler, returning unsubscribe
  subscribe?(topic: string, handler: SubscriptionHandler<R>): SubscriptionUnsubscribe;
}

export type Subscriber = {
  unsubscribe(): void;
}
