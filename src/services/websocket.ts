import { BaseServiceAdapter } from './base.js';
import type { WebSocketMessage, SubscriptionHandler, SubscriptionUnsubscribe } from './types.js';
import { ServiceError, ServiceErrorCode } from './types.js';
import { defaultLogger } from '../security/observability.js';

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  messageTimeout?: number;
  autoConnect?: boolean;
  heartbeatIntervalMs?: number;
  maxBufferSize?: number;
  protocols?: string[];
}

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}

export class WebSocketService extends BaseServiceAdapter<WebSocketMessage, unknown> {
  private ws: WebSocket | null = null;
  private wsConfig: Required<Pick<WebSocketConfig, 'reconnectAttempts' | 'reconnectInterval' | 'messageTimeout' | 'autoConnect' | 'heartbeatIntervalMs' | 'maxBufferSize'>>;
  private reconnectCount = 0;
  private subscriptions = new Map<string, Set<SubscriptionHandler>>();
  private messageHandlers = new Map<string | number, (response: unknown) => void>();
  private messageQueue: WebSocketMessage[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private stateListeners: Array<(state: ConnectionState) => void> = [];
  private boundOnline: (() => void) | null = null;
  private boundOffline: (() => void) | null = null;

  constructor(config: WebSocketConfig) {
    super('websocket', config);
    this.wsConfig = {
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectInterval: config.reconnectInterval ?? 3000,
      messageTimeout: config.messageTimeout ?? 30000,
      autoConnect: config.autoConnect ?? true,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
      maxBufferSize: config.maxBufferSize ?? 1000,
    };

    if (this.wsConfig.autoConnect && typeof window !== 'undefined') {
      void this.connect().catch((error) => {
        defaultLogger.warn('[WebSocketService] autoConnect failed', { error });
      });
    }

    if (typeof window !== 'undefined') {
      this.boundOnline = (): void => this.handleOnline();
      this.boundOffline = (): void => this.handleOffline();
      window.addEventListener('online', this.boundOnline);
      window.addEventListener('offline', this.boundOffline);
    }
  }

  get connectionState(): ConnectionState { return this._connectionState; }

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      const idx = this.stateListeners.indexOf(listener);
      if (idx >= 0) this.stateListeners.splice(idx, 1);
    };
  }

  private setConnectionState(state: ConnectionState): void {
    this._connectionState = state;
    for (const listener of this.stateListeners) {
      try { listener(state); } catch { /* noop */ }
    }
  }

  async transport(_request: WebSocketMessage, _signal?: AbortSignal): Promise<unknown> {
    return this.fetch(_request);
  }

  async execute(request: WebSocketMessage, signal?: AbortSignal): Promise<unknown> {
    return this.executeMiddlewares(request, signal);
  }

  async connect(): Promise<void> {
    this.setConnectionState(ConnectionState.CONNECTING);
    return new Promise((resolve, reject) => {
      try {
        const config = this.wsConfig as unknown as WebSocketConfig;
        this.ws = new WebSocket(config.url!, config.protocols);

        this.ws.onopen = () => {
          this.reconnectCount = 0;
          this.setConnectionState(ConnectionState.CONNECTED);
          this.flushMessageQueue();
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          void event;
          this.handleMessage(event.data);
        };

        this.ws.onerror = () => {
          reject(new ServiceError('WebSocket error', ServiceErrorCode.NETWORK, { retryable: true }));
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          this.setConnectionState(ConnectionState.DISCONNECTED);
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async send<T = unknown>(message: WebSocketMessage): Promise<T | null> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.messageQueue.length < this.wsConfig.maxBufferSize) {
        this.messageQueue.push(message);
      }
      await this.ensureConnected();
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (message.id) this.messageHandlers.delete(message.id);
        resolve(null);
      }, this.wsConfig.messageTimeout);

      if (message.id) {
        this.messageHandlers.set(message.id, (response) => {
          clearTimeout(timeout);
          resolve(response as T);
        });
      }

      try {
        this.ws!.send(JSON.stringify(message));
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  }

  subscribe<T = unknown>(topic: string, handler: SubscriptionHandler<T>): SubscriptionUnsubscribe {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    const handlers = this.subscriptions.get(topic)!;
    handlers.add(handler as SubscriptionHandler);

    this.send({ type: 'subscribe', payload: { topic } }).catch(() => {});

    return {
      unsubscribe: () => {
        handlers.delete(handler as SubscriptionHandler);
        if (handlers.size === 0) {
          this.subscriptions.delete(topic);
          this.send({ type: 'unsubscribe', payload: { topic } }).catch(() => {});
        }
      },
    };
  }

  async fetch(message: WebSocketMessage): Promise<unknown> {
    const id = Date.now();
    return this.send({ ...message, id });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  destroy(): void {
    this.disconnect();
    this.subscriptions.clear();
    this.messageQueue = [];
    this.stateListeners = [];
    if (this.boundOnline) {
      window.removeEventListener('online', this.boundOnline);
      this.boundOnline = null;
    }
    if (this.boundOffline) {
      window.removeEventListener('offline', this.boundOffline);
      this.boundOffline = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', payload: {} }).catch(() => {});
      }
    }, this.wsConfig.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      if (message.type === 'pong') return;

      if (message.id && this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id)!;
        handler(message.payload);
        this.messageHandlers.delete(message.id);
        return;
      }

      if (message.type === 'message') {
        const { topic, data: payload } = message.payload as { topic: string; data: unknown };
        const handlers = this.subscriptions.get(topic);
        if (handlers) {
          handlers.forEach(h => h(payload));
        }
      }
    } catch (error) {
      defaultLogger.error('Failed to parse WebSocket message', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectCount < this.wsConfig.reconnectAttempts) {
      this.reconnectCount++;
      this.setConnectionState(ConnectionState.RECONNECTING);
      const delay = this.wsConfig.reconnectInterval * Math.pow(2, this.reconnectCount - 1)
        + Math.random() * 1000;
      setTimeout(() => {
        this.connect().catch(() => this.attemptReconnect());
      }, delay);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  private handleOnline(): void {
    if (!this.isConnected()) {
      this.connect().catch(() => {});
    }
  }

  private handleOffline(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export { WebSocketService as WebSocketServiceAdapter };
