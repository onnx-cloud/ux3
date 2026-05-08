/**
 * Chat Service Implementation
 * Idiomatic UX3 pattern: service interface with param objects, adapter registry for dependency injection
 */

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: 'text' | 'image' | 'resource' | 'widget';
    text?: string;
    data?: any;
    url?: string;
    mimeType?: string;
    resource?: { uri: string; mimeType: string; text?: string };
    widget?: { kind: string; data: any };
  }>;
  sender: { id: string; name: string; avatar?: string };
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'error';
  reactions?: Record<string, number>;
  threadId?: string | null;
  badge?: 'new' | 'pinned' | 'important';
}

export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  presence?: 'online' | 'away' | 'offline';
}

/**
 * Idiomatic: all params passed as single object (future-proof for optional fields)
 */
export interface ChatService {
  sendMessage(params: { conversationId: string; text: string }): Promise<ChatMessage>;
  fetchHistory(params: { conversationId: string; limit: number; offset?: number }): Promise<ChatMessage[]>;
  loadContacts(params?: {}): Promise<Contact[]>;
  subscribe(params: { conversationId: string }, onMessage: (msg: ChatMessage) => void): () => void;
  updatePresence(params: { status: 'online' | 'away' | 'offline' }): Promise<void>;
}

/**
 * Mock implementation for kitchen.sink demo
 */
export class MockChatService implements ChatService {
  private history: Map<string, ChatMessage[]> = new Map();
  private subscribers: Map<string, Set<(msg: ChatMessage) => void>> = new Map();
  private messageCounter: number = 0;

  constructor(initialHistory?: Map<string, ChatMessage[]>) {
    this.history = initialHistory || this.createSampleHistory();
  }

  private createSampleHistory(): Map<string, ChatMessage[]> {
    const now = new Date().toISOString();
    const history = new Map<string, ChatMessage[]>();

    // Sample conversation
    history.set('conv-1', [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: [{ type: 'text', text: 'Hello! Can you help me with this?' }],
        sender: { id: 'user-1', name: 'You', avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%234A90E2%22/%3E%3Ctext x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22 font-weight=%22bold%22%3EU%3C/text%3E%3C/svg%3E' },
        timestamp: new Date(Date.now() - 120000).toISOString(),
        status: 'sent'
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: [{ type: 'text', text: 'Of course! I\'d be happy to help. What do you need?' }],
        sender: { id: 'bot-1', name: 'Support Assistant', avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%2350C878%22/%3E%3Ctext x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22 font-weight=%22bold%22%3EA%3C/text%3E%3C/svg%3E' },
        timestamp: new Date(Date.now() - 60000).toISOString(),
        status: 'sent'
      },
      {
        id: 'msg-3',
        conversationId: 'conv-1',
        role: 'user',
        content: [{ type: 'text', text: 'I\'m trying to understand the chat architecture.' }],
        sender: { id: 'user-1', name: 'You', avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%234A90E2%22/%3E%3Ctext x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22 font-weight=%22bold%22%3EU%3C/text%3E%3C/svg%3E' },
        timestamp: new Date(Date.now() - 30000).toISOString(),
        status: 'sent'
      }
    ]);

    return history;
  }

  async sendMessage(params: { conversationId: string; text: string }): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: `msg-${++this.messageCounter}`,
      conversationId: params.conversationId,
      role: 'user',
      content: [{ type: 'text', text: params.text }],
      sender: { id: 'user-1', name: 'You', avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%234A90E2%22/%3E%3Ctext x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22 font-weight=%22bold%22%3EU%3C/text%3E%3C/svg%3E' },
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    const hist = this.history.get(params.conversationId) || [];
    hist.push(msg);
    this.history.set(params.conversationId, hist);

    // Simulate bot response after delay
    setTimeout(() => {
      const response: ChatMessage = {
        id: `msg-${++this.messageCounter}`,
        conversationId: params.conversationId,
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `I received your message: "${params.text}". This is a mock response from the chat service.`
          }
        ],
        sender: { id: 'bot-1', name: 'Support Assistant', avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%2350C878%22/%3E%3Ctext x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22 font-weight=%22bold%22%3EA%3C/text%3E%3C/svg%3E' },
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      const updatedHist = this.history.get(params.conversationId) || [];
      updatedHist.push(response);
      this.history.set(params.conversationId, updatedHist);

      // Notify subscribers
      const subs = this.subscribers.get(params.conversationId);
      if (subs) {
        subs.forEach(callback => callback(response));
      }
    }, 500);

    return msg;
  }

  async fetchHistory(params: { conversationId: string; limit: number; offset?: number }): Promise<ChatMessage[]> {
    const hist = this.history.get(params.conversationId) || [];
    const offset = params.offset || 0;
    return hist.slice(offset, offset + params.limit);
  }

  async loadContacts(): Promise<Contact[]> {
    return [
      {
        id: 'contact-1',
        name: 'Support Team',
        presence: 'online',
        avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%2350C878%22/%3E%3Ctext x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22 font-weight=%22bold%22%3ES%3C/text%3E%3C/svg%3E'
      },
      {
        id: 'contact-2',
        name: 'Sales Team',
        presence: 'away',
        avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23FF9500%22/%3E%3Ctext x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22 font-weight=%22bold%22%3ESA%3C/text%3E%3C/svg%3E'
      }
    ];
  }

  subscribe(params: { conversationId: string }, onMessage: (msg: ChatMessage) => void): () => void {
    if (!this.subscribers.has(params.conversationId)) {
      this.subscribers.set(params.conversationId, new Set());
    }
    const subs = this.subscribers.get(params.conversationId)!;
    subs.add(onMessage);

    // Return unsubscribe function
    return () => {
      subs.delete(onMessage);
    };
  }

  async updatePresence(params: { status: 'online' | 'away' | 'offline' }): Promise<void> {
    // Mock: no-op
  }
}

/**
 * Factory function for adapter pattern (idiomatic UX3)
 */
export const createChatService = (adapter: 'mock' | 'http' = 'mock'): ChatService => {
  switch (adapter) {
    case 'mock':
      return new MockChatService();
    // Future adapters: HTTP, WebSocket, GraphQL
    default:
      return new MockChatService();
  }
};
