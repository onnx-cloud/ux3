import { UxBase } from '@ux3/ui/widget/primitives/base';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  id?: string;
  token_count?: number;
  timestamp?: number;
}

export class UxChatMessages extends UxBase {
  private messages: ChatMessage[] = [];

  static get observedAttributes(): string[] {
    return ['messages'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  protected onConnected(): void {
    super.onConnected();
    this.parseMessages();
    this.render();
    this.shadowRoot?.addEventListener('contextmenu', this.onContextMenu);
    this.addEventListener('ux:context-action', this.onContextAction);
  }

  protected onDisconnected(): void {
    this.shadowRoot?.removeEventListener('contextmenu', this.onContextMenu);
    this.removeEventListener('ux:context-action', this.onContextAction);
    super.onDisconnected();
  }

  protected applyData(data: any): void {
    if (Array.isArray(data)) {
      this.messages = data;
      this.render();
    } else if (data && Array.isArray(data.messages)) {
      this.messages = data.messages;
      this.render();
    }
  }

  protected onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void {
    if (name === 'messages' && this.isConnected) {
      this.parseMessages();
      this.render();
    }
  }

  private parseMessages(): void {
    const raw = this.getAttribute('messages');
    if (!raw) { this.messages = []; return; }
    try {
      this.messages = JSON.parse(raw);
    } catch {
      const text = this.textContent?.trim();
      if (text) {
        try { this.messages = JSON.parse(text); } catch { this.messages = []; }
      } else {
        this.messages = [];
      }
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const hasSlot = !this.hasAttribute('messages') && this.querySelector('ux-chat-bubble');
    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      ${hasSlot
        ? '<slot></slot>'
        : (this.messages.length === 0
          ? '<div class="ux-chat-message-empty">No messages yet</div>'
          : this.messages.map((msg) => this.renderMessage(msg)).join(''))
      }
    `;
    this.scrollToBottom();
  }

  protected getStyles(): string {
    return `
      :host {
        display: block; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth;
      }
      .ux-chat-message-row {
        display: flex; flex-direction: column; margin-bottom: 0.5rem; align-items: stretch; position: relative;
      }
      .ux-chat-message-row[data-role="user"]      { align-items: flex-end; }
      .ux-chat-message-row[data-role="assistant"]  { align-items: flex-start; }
      .ux-chat-message-row[data-role="system"]     { align-items: center; }
      .ux-chat-message-row[data-role="tool"]       { align-items: flex-start; }
      .ux-chat-message-bubble {
        position: relative; display: inline-block;
        max-width: var(--ux-chat-message-max-w, 85%);
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem; line-height: 1.45;
        white-space: pre-wrap; word-break: break-word;
      }
      .ux-chat-message-bubble[data-role="user"]      { background: var(--color-bg-muted, #f3f4f6); color: var(--color-text, #0f172a); border-bottom-right-radius: 0.25rem; }
      .ux-chat-message-bubble[data-role="assistant"]  { background: var(--color-bg, #fff); color: var(--color-text, #0f172a); border: 1px solid var(--color-border, #e2e8f0); border-bottom-left-radius: 0.25rem; }
      .ux-chat-message-bubble[data-role="system"]     { background: var(--color-bg-muted, #f8fafc); color: var(--color-text-muted, #6b7280); font-style: italic; font-size: 0.75rem; }
      .ux-chat-message-bubble[data-role="tool"]       { background: var(--color-bg-muted, #f8fafc); color: var(--color-text, #0f172a); font-family: monospace; font-size: 0.75rem; border-left: 3px solid var(--color-border, #d1d5db); }
      .ux-chat-message-time {
        position: absolute; bottom: 0; right: var(--ux-chat-message-time-offset, 0.25rem);
        font-size: var(--ux-chat-message-time-size, 0.5rem); line-height: 1;
        color: inherit; opacity: 0; transition: opacity var(--ux-chat-message-time-transition, 0.15s);
        padding: var(--ux-chat-message-time-p, 0 0.125rem 0.0625rem 0.25rem);
        background: inherit; border-radius: var(--ux-chat-message-time-radius, 0.125rem);
        pointer-events: none; user-select: none;
      }
      .ux-chat-message-bubble:hover .ux-chat-message-time { opacity: var(--ux-chat-message-time-opacity, 0.5); }
      .ux-chat-message-empty {
        text-align: center; color: var(--color-muted, #64748b);
        padding: var(--ux-chat-message-empty-p, 1.5rem 1rem);
        font-size: var(--ux-chat-message-size, 0.8125rem);
      }
    `;
  }

  private renderMessage(msg: ChatMessage): string {
    const role = msg.role || 'assistant';
    const content = this.escapeHtml(String(msg.content ?? ''));
    const ts = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    return `
      <div class="ux-chat-message-row" data-role="${role}" data-index="${this.messages.indexOf(msg)}">
        <div class="ux-chat-message-bubble" data-role="${role}">
          <div>${content}</div>
          ${ts ? `<span class="ux-chat-message-time">${ts}</span>` : ''}
        </div>
      </div>
    `;
  }

  private readonly onContextAction = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail?.action) return;
    const action = detail.action as string;
    const source = detail.source as { index: number; content: string; role: string };

    switch (action) {
      case 'copy':
        if (source?.content) {
          navigator.clipboard?.writeText(source.content).catch(() => {});
        }
        break;
      case 'delete':
        if (source?.index != null) {
          const next = [...this.messages];
          next.splice(source.index, 1);
          this.setMessages(next);
        }
        break;
      case 'regenerate':
        this.sendToFSM('REGENERATE', { index: source?.index });
        break;
    }
  };

  private setMessages(msgs: ChatMessage[]): void {
    this.messages = msgs;
    this.render();
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true, composed: true,
      detail: { value: msgs },
    }));
  }
  private readonly onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const row = (e.target as HTMLElement).closest('.ux-chat-message-row') as HTMLElement;
    if (!row || !row.dataset.role) return;
    const index = parseInt(row.dataset.index || '', 10);
    const msg = this.messages[index];
    if (!msg) return;
    const menu = document.querySelector('ux-context-menu#chat-context-menu') as any;
    if (menu && typeof menu.open === 'function') {
      menu.open(e.clientX, e.clientY, row.dataset.role, {
        index,
        role: row.dataset.role,
        content: msg.content,
        message: msg,
      });
    }
  };

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      if (this.shadowRoot) {
        const host = this.shadowRoot.host as HTMLElement;
        host.scrollTop = host.scrollHeight;
      }
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
}
