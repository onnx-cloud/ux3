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
export declare class WebSocketService extends Service<WebSocketMessage> {
    private ws;
    private wsConfig;
    private reconnectCount;
    private subscriptions;
    private messageHandlers;
    private messageQueue;
    constructor(config: WebSocketConfig);
    /**
     * Connect to WebSocket
     */
    connect(): Promise<void>;
    /**
     * Send message
     */
    send<T = any>(message: WebSocketMessage): Promise<T | null>;
    /**
     * Subscribe to a topic
     */
    subscribe<T = any>(topic: string, handler: SubscriptionHandler<T>): SubscriptionUnsubscribe;
    /**
     * Fetch via WebSocket (request-response pattern)
     */
    fetch(message: WebSocketMessage): Promise<any>;
    /**
     * Disconnect
     */
    disconnect(): void;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Handle incoming message
     */
    private handleMessage;
    /**
     * Attempt reconnection
     */
    private attemptReconnect;
    /**
     * Flush queued messages
     */
    private flushMessageQueue;
    /**
     * Ensure connected
     */
    private ensureConnected;
    /**
     * Handle going online
     */
    private handleOnline;
    /**
     * Handle going offline
     */
    private handleOffline;
}
