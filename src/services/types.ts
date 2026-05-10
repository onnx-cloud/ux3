export interface Middleware<T = unknown, R = unknown> {
  (request: T, next: (req: T) => Promise<R>): Promise<R>;
}

export interface ErrorHandler {
  (error: Error, retry: () => Promise<unknown>): Promise<unknown>;
}

export interface ServiceConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  autoConnect?: boolean;
  region?: string;
  messageTimeout?: number;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface RequestConfig extends ServiceConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, unknown>;
  data?: unknown;
  auth?: { token: string };
}

export interface ResponseData<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface ServiceResponse<T = unknown> {
  method: string;
  status: number;
  data: T;
  ok?: boolean;
  error?: Error;
}

export type SubscriptionUnsubscribe = Subscriber;

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  id?: string | number;
}

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number;
}

export interface JSONRPCResponse<T = unknown> {
  jsonrpc: '2.0';
  result?: T;
  error?: { code: number; message: string; data?: unknown };
  id: string | number;
}

export interface SubscriptionHandler<T = unknown> {
  (data: T): void;
}

export interface Subscriber {
  unsubscribe(): void;
}

export enum ServiceErrorCode {
  NETWORK = 'SVC_NETWORK',
  TIMEOUT = 'SVC_TIMEOUT',
  UNAUTHORIZED = 'SVC_UNAUTHORIZED',
  FORBIDDEN = 'SVC_FORBIDDEN',
  NOT_FOUND = 'SVC_NOT_FOUND',
  RATE_LIMITED = 'SVC_RATE_LIMITED',
  CIRCUIT_OPEN = 'SVC_CIRCUIT_OPEN',
  VALIDATION = 'SVC_VALIDATION',
  PARSE = 'SVC_PARSE',
  ABORTED = 'SVC_ABORTED',
  UNKNOWN = 'SVC_UNKNOWN',
}

export class ServiceError extends Error {
  public readonly code: ServiceErrorCode;
  public readonly status?: number;
  public readonly retryable: boolean;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ServiceErrorCode,
    options?: { status?: number; retryable?: boolean; cause?: Error }
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
    this.cause = options?.cause;
  }

  static fromError(error: Error, code: ServiceErrorCode = ServiceErrorCode.UNKNOWN): ServiceError {
    if (error instanceof ServiceError) return error;
    return new ServiceError(error.message, code, { cause: error });
  }
}

export interface ServiceAdapter<TReq = unknown, TRes = unknown> {
  readonly name: string;
  readonly config: ServiceConfig;
  execute(request: TReq, signal?: AbortSignal): Promise<TRes>;
  destroy?(): void | Promise<void>;
  subscribe?(topic: string, handler: (data: unknown) => void): () => void;
}

export type Service<T = unknown, R = unknown> = {
  name?: string;
  fetch?(request: T): Promise<R>;
  call?(method: string, params?: unknown): Promise<unknown>;
  update?(request: T): Promise<R>;
  find?(options?: Record<string, unknown>): Promise<R[]>;
  subscribe?(topic: string, handler: SubscriptionHandler<R>): SubscriptionUnsubscribe;
};
