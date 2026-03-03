/**
 * Services Index
 * Export all service implementations
 */

export { Service } from './base.js';
export type { Middleware, ErrorHandler, ServiceConfig, RequestConfig } from './types.js';
export { HTTPService } from './http.js';
export type { WebSocketConfig } from './websocket.js';
export { WebSocketService } from './websocket.js';
export { JSONRPCService } from './jsonrpc.js';
export { Router } from './router.js';
export type {
  ServiceResponse,
  WebSocketMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  SubscriptionHandler,
  SubscriptionUnsubscribe,
} from './types.js';
export {
  loggingMiddleware,
  timeoutWarningMiddleware,
  requestMutationMiddleware,
  cacheTrackingMiddleware,
  headerAugmentationMiddleware,
  retryMiddleware,
  circuitBreakerMiddleware,
  composeMiddleware,
  productionMiddlewareStack,
  developmentMiddlewareStack,
} from './middleware.js';
export type { LogContext } from './middleware.js';
export type {
  NavRoute,
  NavConfig,
  RouteConfig,
  RouteMatch,
} from './router.js';
