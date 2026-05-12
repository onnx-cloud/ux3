import { UxBase } from '../../../../src/ui/widget/primitives/base';

type AgentMode = 'chat' | 'blocking' | 'queue' | 'steering';

interface ChatMessagePart {
  type: 'text' | 'tool_call' | 'tool_result' | 'markdown' | 'code';
  text?: string;
  toolName?: string;
  toolCallId?: string;
  args?: string;
  result?: string;
  language?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'tool_call' | 'tool_result';
  content: string;
  parts?: ChatMessagePart[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface AgentSession {
  id: string;
  state: 'idle' | 'thinking' | 'tool_calling' | 'error';
  mode: AgentMode;
  send(message: { role: string; content: string }, signal?: AbortSignal): Promise<{ role: string; content: string | Record<string, unknown>; timestamp: number; metadata?: Record<string, unknown> }>;
  stream(message: { role: string; content: string }, signal?: AbortSignal): AsyncIterable<{ role: string; content: string | Record<string, unknown>; timestamp: number; metadata?: Record<string, unknown> }>;
  cancel(): void;
  setMode?(mode: AgentMode): void;
}

export class UxChatMessenger extends UxBase {
  private messagesEl: HTMLElement | null = null;
  private composerEl: HTMLElement | null = null;
  private stopBtn: HTMLButtonElement | null = null;
  private statusEl: HTMLElement | null = null;
  private messages: ChatMessage[] = [];
  private agentName: string | null = null;
  private sessionId: string | null = null;
  private mode: AgentMode = 'chat';
  private isSending = false;
  private useLightDom = false;
  private activeAbortController: AbortController | null = null;

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
    this.composerEl?.removeEventListener('ux:chat.send', this.onComposerSend as EventListener);
    this.stopBtn?.removeEventListener('click', this.onStop);
    this.cancelActiveRequest();
    super.onDisconnected();
  }

  private cancelActiveRequest(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    const session = this.getExistingSession();
    if (session && typeof session.cancel === 'function') {
      session.cancel();
    }
    this.isSending = false;
    this.updateStatus();
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
    this.stopBtn = host.querySelector('.stop-btn');
    this.statusEl = host.querySelector('.status-indicator');
  }

  private setupListeners(): void {
    if (this.composerEl) {
      this.composerEl.addEventListener('ux:chat.send', this.onComposerSend as EventListener);
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', this.onStop);
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

  private readonly onStop = (): void => {
    this.cancelActiveRequest();
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
    this.dispatchEvent(new CustomEvent('ux:chat.send', {
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
      this.activeAbortController = new AbortController();
      this.updateStatus();

      if (typeof session.stream === 'function') {
        for await (const turn of session.stream({ role: 'user', content: text }, this.activeAbortController.signal)) {
          this.appendTurn(turn, session);
        }
      } else {
        const assistantTurn = await session.send({ role: 'user', content: text }, this.activeAbortController.signal);
        this.appendTurn(assistantTurn, session);
      }

      this.updateStatus();
      this.dispatchEvent(new CustomEvent('ux:chat.message', {
        bubbles: true,
        composed: true,
        detail: { sessionId: session.id, messages: this.messages.slice() },
      }));
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        this.addSystemMessage(`Agent error: ${String(error)}`);
      }
    } finally {
      this.isSending = false;
      this.activeAbortController = null;
      this.updateStatus();
    }
  }

  private appendTurn(turn: { role: string; content: string | Record<string, unknown>; timestamp: number; metadata?: Record<string, unknown> }, session: AgentSession): void {
    const role = turn.role as ChatMessage['role'];
    const content = typeof turn.content === 'string' ? turn.content : JSON.stringify(turn.content);

    let parts: ChatMessagePart[] | undefined;

    if (role === 'tool_call') {
      const c = turn.content as Record<string, unknown>;
      parts = [{
        type: 'tool_call',
        toolName: (c.name as string) || (turn.metadata?.toolName as string) || 'unknown',
        toolCallId: (c.id as string) || (turn.metadata?.toolCallId as string),
        args: c.args ? JSON.stringify(c.args) : undefined,
      }];
    } else if (role === 'tool_result') {
      parts = [{
        type: 'tool_result',
        toolName: (turn.metadata?.toolName as string) || 'unknown',
        toolCallId: (turn.metadata?.toolCallId as string),
        result: content,
      }];
    }

    this.messages.push({
      role,
      content,
      parts,
      timestamp: turn.timestamp || Date.now(),
      metadata: turn.metadata,
    });
    this.updateMessagesView();

    if (session.state) {
      this.updateStatus(session.state);
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

  private getExistingSession(): AgentSession | undefined {
    const service = this.getMcpService();
    if (!service || !this.sessionId) return undefined;
    return service.getSession(this.sessionId);
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
        <div class="messenger-header">
          <span class="status-indicator" data-state="idle">Ready</span>
          <button class="stop-btn" type="button" aria-label="Stop" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>
          </button>
        </div>
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

  private updateStatus(state?: string): void {
    if (!this.statusEl) return;
    if (!state && this.isSending) state = 'thinking';
    if (!state && !this.isSending) state = 'idle';

    this.statusEl.dataset.state = state;

    switch (state) {
      case 'thinking':
        this.statusEl.textContent = 'Thinking...';
        break;
      case 'tool_calling':
        this.statusEl.textContent = 'Calling tool...';
        break;
      case 'error':
        this.statusEl.textContent = 'Error';
        break;
      default:
        this.statusEl.textContent = 'Ready';
    }

    if (this.stopBtn) {
      this.stopBtn.disabled = !this.isSending;
    }
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
    const validRoles = ['user', 'assistant', 'system', 'tool', 'tool_call', 'tool_result'];
    return {
      role: validRoles.includes(msg?.role) ? msg.role : 'assistant',
      content: typeof msg?.content === 'string' ? msg.content : JSON.stringify(msg?.content ?? ''),
      parts: Array.isArray(msg?.parts) ? msg.parts : undefined,
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
      .messenger-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.125rem 0.25rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        flex-shrink: 0;
      }
      .status-indicator {
        font-size: 0.625rem;
        color: var(--color-text-muted, #9ca3af);
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .status-indicator::before {
        content: '';
        display: inline-block;
        width: 0.375rem;
        height: 0.375rem;
        border-radius: 50%;
        background: var(--color-border, #d1d5db);
      }
      .status-indicator[data-state="thinking"]::before {
        background: #eab308;
        animation: pulse-status 1s ease-in-out infinite;
      }
      .status-indicator[data-state="tool_calling"]::before {
        background: #3b82f6;
        animation: pulse-status 0.5s ease-in-out infinite;
      }
      .status-indicator[data-state="error"]::before {
        background: #ef4444;
      }
      @keyframes pulse-status {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .stop-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border: none;
        border-radius: 0.25rem;
        background: var(--color-bg-muted, #f3f4f6);
        color: var(--color-error, #dc2626);
        cursor: pointer;
        padding: 0;
        opacity: 0.6;
        transition: opacity 0.15s;
      }
      .stop-btn:hover:not(:disabled) { opacity: 1; }
      .stop-btn:disabled { opacity: 0.15; cursor: not-allowed; }
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
