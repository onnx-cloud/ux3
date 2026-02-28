/**
 * WebSocket Service
 * Real-time bidirectional communication with reconnection
 */

import { Service } from './base.js';
import type { WebSocketMessage, SubscriptionHandler, SubscriptionUnsubscribe } from './types.js';

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  messageTimeout?: number;
  autoConnect?: boolean;
}

export class WebSocketService extends Service<WebSocketMessage> {
  private ws: WebSocket | null = null;
  private wsConfig: WebSocketConfig & { reconnectAttempts: number; reconnectInterval: number };
  private reconnectCount = 0;
  private subscriptions = new Map<string, Set<SubscriptionHandler>>();
  private messageHandlers = new Map<string | number, (response: any) => void>();
  private messageQueue: WebSocketMessage[] = [];

  constructor(config: WebSocketConfig) {
    super();
    this.wsConfig = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      messageTimeout: 30000,
      autoConnect: true,
      ...config,
    };

    if (this.config.autoConnect) {
      this.connect();
    }

    // Monitor online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsConfig.url);

        this.ws.onopen = () => {
          this.reconnectCount = 0;
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          // Use event parameter to avoid unused warning
          void event;
          this.handleMessage(event.data);
        };

        this.ws.onerror = () => {
          reject(new Error('WebSocket error'));
        };

        this.ws.onclose = () => {
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message
   */
  async send<T = any>(message: WebSocketMessage): Promise<T | null> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      await this.ensureConnected();
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (message.id) {
          this.messageHandlers.delete(message.id);
        }
        resolve(null);
      }, this.config.messageTimeout);

      if (message.id) {
        this.messageHandlers.set(message.id, (response) => {
          clearTimeout(timeout);
          resolve(response);
        });
      }

      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  }

  /**
   * Subscribe to a topic
   */
  subscribe<T = any>(
    topic: string,
    handler: SubscriptionHandler<T>
  ): SubscriptionUnsubscribe {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }

    const handlers = this.subscriptions.get(topic)!;
    handlers.add(handler as SubscriptionHandler);

    // Notify server of subscription
    this.send({
      type: 'subscribe',
      payload: { topic },
    }).catch(() => {
      // Handle subscription failure
    });

    return {
      unsubscribe: () => {
        handlers.delete(handler as SubscriptionHandler);
        if (handlers.size === 0) {
          this.subscriptions.delete(topic);
          // Notify server of unsubscription
          this.send({
            type: 'unsubscribe',
            payload: { topic },
          }).catch(() => {
            // Handle unsubscription failure
          });
        }
      },
    };
  }

  /**
   * Fetch via WebSocket (request-response pattern)
   */
  async fetch(message: WebSocketMessage): Promise<any> {
    const id = Date.now();
    return this.send({
      ...message,
      id,
    });
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Handle response to request
      if (message.id && this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id)!;
        handler(message.payload);
        this.messageHandlers.delete(message.id);
        return;
      }

      // Handle subscription message
      if (message.type === 'message') {
        const { topic, data: payload } = message.payload as {
          topic: string;
          data: any;
        };
        const handlers = this.subscriptions.get(topic);
        if (handlers) {
          handlers.forEach(handler => handler(payload));
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnect(): void {
    const reconnectAttempts = this.config.reconnectAttempts || 5;
    const reconnectInterval = this.config.reconnectInterval || 1000;
    
    if (this.reconnectCount < reconnectAttempts) {
      this.reconnectCount++;
      setTimeout(() => {
        this.connect().catch(() => this.attemptReconnect());
      }, reconnectInterval);
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Ensure connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  /**
   * Handle going online
   */
  private handleOnline(): void {
    if (!this.isConnected()) {
      this.connect().catch(() => {
        // Handle connection failure
      });
    }
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    // Mark as offline by disconnecting
    if (this.ws) {
      this.ws.close();
    }
  }
}
