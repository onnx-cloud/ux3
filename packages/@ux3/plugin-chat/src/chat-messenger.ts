import { UxBase } from '@ux3/ui/widget/primitives/base';

type AgentMode = 'chat' | 'blocking' | 'queue' | 'steering';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface AgentSession {
  id: string;
  state: 'idle' | 'thinking' | 'tool_calling' | 'error';
  mode: AgentMode;
  send(message: { role: string; content: string }, signal?: AbortSignal): Promise<{ role: string; content: string | Record<string, unknown>; timestamp: number; metadata?: Record<string, unknown> }>;
  setMode?(mode: AgentMode): void;
}

export class UxChatMessenger extends UxBase {
  private messagesEl: HTMLElement | null = null;
  private composerEl: HTMLElement | null = null;
  private messages: ChatMessage[] = [];
  private agentName: string | null = null;
  private sessionId: string | null = null;
  private mode: AgentMode = 'chat';
  private isSending = false;
  private useLightDom = false;

  static get observedAttributes(): string[] {
    return ['messages', 'placeholder', 'disabled', 'send-on', 'accept', 'allow-attachments', 'agent', 'session-id', 'mode'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  protected onConnected(): void {
    super.onConnected();
    this.syncAttributes();
    this.render();
    this.cacheDom();
    this.setupListeners();
    this.updateMessagesView();
  }

  protected onDisconnected(): void {
    this.composerEl?.removeEventListener('ux:send', this.onComposerSend as EventListener);
    super.onDisconnected();
  }

  private syncAttributes(): void {
    this.agentName = this.getAttribute('agent');
    this.sessionId = this.getAttribute('session-id');
    this.mode = this.parseMode(this.getAttribute('mode'));
    const messages = this.getAttribute('messages');
    if (messages) {
      this.messages = this.parseMessages(messages);
    }
  }

  private cacheDom(): void {
    const host = this.useLightDom ? this : this.shadowRoot;
    if (!host) return;
    this.messagesEl = host.querySelector('ux-chat-messages');
    this.composerEl = host.querySelector('ux-chat-composer');
  }

  private setupListeners(): void {
    if (this.composerEl) {
      this.composerEl.addEventListener('ux:send', this.onComposerSend as EventListener);
    }
  }

  protected applyData(data: any): void {
    if (data && typeof data === 'object' && Array.isArray(data.messages)) {
      this.messages = data.messages.map((msg: any) => this.normalizeMessage(msg));
      this.updateMessagesView();
    }
  }

  protected onAttributeChanged(name: string, _old: string | null, _new: string | null): void {
    if (!this.isConnected) return;
    switch (name) {
      case 'messages':
        this.messages = this.parseMessages(_new);
        this.updateMessagesView();
        break;
      case 'agent':
        this.agentName = _new;
        break;
      case 'session-id':
        this.sessionId = _new;
        break;
      case 'mode':
        this.mode = this.parseMode(_new);
        break;
    }
    if (this.composerEl) {
      if (name === 'placeholder') this.composerEl.setAttribute('placeholder', _new || 'Type a message...');
      if (name === 'disabled') {
        if (_new !== null) this.composerEl.setAttribute('disabled', ''); else this.composerEl.removeAttribute('disabled');
      }
      if (name === 'send-on') {
        if (_new !== null) this.composerEl.setAttribute('send-on', _new); else this.composerEl.removeAttribute('send-on');
      }
      if (name === 'accept') {
        if (_new !== null) this.composerEl.setAttribute('accept', _new);
      }
      if (name === 'allow-attachments') {
        if (_new !== null) this.composerEl.setAttribute('allow-attachments', ''); else this.composerEl.removeAttribute('allow-attachments');
      }
    }
  }

  private readonly onComposerSend = (event: Event): void => {
    event.stopPropagation();
    const detail = (event as CustomEvent).detail || {};
    this.handleSend(detail).catch(() => {
      this.addSystemMessage('Unable to send message.');
    });
  };

  private async handleSend(detail: Record<string, any>): Promise<void> {
    const text = String(detail.text ?? detail.message ?? detail.messageText ?? '').trim();
    const attachments = Array.isArray(detail.attachments) ? detail.attachments : [];
    if (!text && attachments.length === 0) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      metadata: { attachments, mentions: detail.mentions, tags: detail.tags },
    };

    this.messages.push(userMessage);
    this.updateMessagesView();
    this.dispatchEvent(new CustomEvent('ux:send', {
      bubbles: true,
      composed: true,
      detail: { ...detail, sessionId: this.sessionId, agent: this.agentName, mode: this.mode },
    }));

    const session = this.getOrCreateSession();
    if (!session) {
      this.addSystemMessage('MCP session is unavailable.');
      return;
    }

    if (session.setMode) {
      session.setMode(this.mode);
    }

    try {
      this.isSending = true;
      const assistantTurn = await session.send({ role: 'user', content: text });
      const assistantContent = typeof assistantTurn.content === 'string'
        ? assistantTurn.content
        : JSON.stringify(assistantTurn.content);

      this.messages.push({
        role: 'assistant',
        content: assistantContent,
        timestamp: assistantTurn.timestamp || Date.now(),
        metadata: assistantTurn.metadata,
      });
      this.updateMessagesView();
      this.dispatchEvent(new CustomEvent('ux:message', {
        bubbles: true,
        composed: true,
        detail: { sessionId: session.id, message: assistantTurn, messages: this.messages.slice() },
      }));
    } catch (error) {
      this.addSystemMessage(`Agent error: ${String(error)}`);
    } finally {
      this.isSending = false;
    }
  }

  private getOrCreateSession(): AgentSession | undefined {
    const service = this.getMcpService();
    if (!service) return undefined;

    const agent = this.agentName || (typeof service.listAgents === 'function' ? service.listAgents()[0] : undefined);
    if (!agent) return undefined;

    let session: AgentSession | undefined = undefined;
    if (this.sessionId && typeof service.getSession === 'function') {
      session = service.getSession(this.sessionId);
    }

    if (!session && typeof service.createSession === 'function') {
      session = service.createSession(agent, { id: this.sessionId || undefined, mode: this.mode });
      this.sessionId = session.id;
      if (!this.hasAttribute('session-id')) {
        this.setAttribute('session-id', session.id);
      }
    }

    return session;
  }

  private getMcpService(): any {
    return (window as any).__ux3McpService || (window as any).__ux3App?.services?.mcp;
  }

  private hasLightDomChat(): boolean {
    return Boolean(this.querySelector('ux-chat-messages') || this.querySelector('ux-chat-composer'));
  }

  private render(): void {
    const messages = JSON.stringify(this.messages);
    const placeholder = this.getAttribute('placeholder') || 'Type a message...';
    const disabled = this.hasAttribute('disabled') ? 'disabled' : '';
    const sendOn = this.getAttribute('send-on') || 'enter';
    const accept = this.getAttribute('accept') || 'image/*,.pdf,.txt,.md,.csv,.json';
    const allowAttachments = this.hasAttribute('allow-attachments');
    this.useLightDom = this.hasLightDomChat();

    if (!this.shadowRoot) return;
    if (this.useLightDom) {
      this.shadowRoot.innerHTML = `
        <style>${this.styles()}</style>
        <slot></slot>
      `;
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <div class="messenger">
        <ux-chat-messages messages='${this.escapeAttribute(messages)}'></ux-chat-messages>
        <ux-chat-composer
          placeholder="${this.escapeAttribute(placeholder)}"
          ${disabled}
          send-on="${this.escapeAttribute(sendOn)}"
          accept="${this.escapeAttribute(accept)}"
          ${allowAttachments ? 'allow-attachments' : ''}
        ></ux-chat-composer>
      </div>
    `;
  }

  setMessages(messages: ChatMessage[]): void {
    this.messages = messages.map((msg) => this.normalizeMessage(msg));
    this.updateMessagesView();
  }

  private updateMessagesView(): void {
    if (!this.messagesEl) return;
    this.messagesEl.setAttribute('messages', JSON.stringify(this.messages));
  }

  private addSystemMessage(text: string): void {
    this.messages.push({ role: 'system', content: text, timestamp: Date.now() });
    this.updateMessagesView();
  }

  private parseMessages(raw: string | null): ChatMessage[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((msg) => this.normalizeMessage(msg)) : [];
    } catch {
      return [];
    }
  }

  private normalizeMessage(msg: any): ChatMessage {
    return {
      role: ['user', 'assistant', 'system', 'tool'].includes(msg?.role) ? msg.role : 'assistant',
      content: typeof msg?.content === 'string' ? msg.content : JSON.stringify(msg?.content ?? ''),
      timestamp: typeof msg?.timestamp === 'number' ? msg.timestamp : Date.now(),
      metadata: typeof msg?.metadata === 'object' && msg?.metadata !== null ? msg.metadata : undefined,
    };
  }

  private parseMode(value: string | null): AgentMode {
    if (value === 'blocking' || value === 'queue' || value === 'steering') return value;
    return 'chat';
  }

  private escapeAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private styles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        min-height: 0;
      }
      .messenger {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }
      ux-chat-messages {
        flex: 1 1 0;
        min-height: 0;
      }
      ux-chat-composer {
        flex-shrink: 0;
      }
    `;
  }
}
