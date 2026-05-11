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

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.parseMessages();
    this.render();
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
        try {
          this.messages = JSON.parse(text);
        } catch {
          this.messages = [];
        }
      } else {
        this.messages = [];
      }
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const hasSlot = !this.hasAttribute('messages') && this.querySelector('ux-chat-bubble');
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth; }
        ${hasSlot ? '::slotted(*) { display: block; }' : ''}
        .msg-row {
          display: flex; margin-bottom: 0.75rem; gap: 0.5rem; align-items: flex-start; padding: 0 0.5rem;
        }
        .msg-row.user  { justify-content: flex-end; }
        .msg-row.assistant { justify-content: flex-start; }
        .msg-row.system { justify-content: center; }
        .msg-row.tool   { justify-content: flex-start; }
        .msg-bubble {
          max-width: 80%; padding: 0.625rem 0.875rem; border-radius: 0.75rem; font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
        }
        .msg-bubble.user  { background: var(--color-accent, #2563eb); color: #fff; border-bottom-right-radius: 0.25rem; }
        .msg-bubble.assistant { background: var(--color-surface-alt, #f1f5f9); color: var(--color-text, #334155); border-bottom-left-radius: 0.25rem; }
        .msg-bubble.system { background: var(--color-surface, #fff); color: var(--color-text, #334155); border: 1px solid var(--color-border, #e2e8f0); font-style: italic; font-size: 0.8125rem; }
        .msg-bubble.tool   { background: var(--color-surface-alt, #f1f5f9); color: var(--color-text, #334155); font-family: monospace; font-size: 0.8125rem; border-left: 3px solid var(--color-accent, #2563eb); }
        .msg-label {
          font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted, #64748b); margin-bottom: 0.125rem; font-weight: 600;
        }
        .msg-empty { text-align: center; color: var(--color-muted, #64748b); padding: 2rem 1rem; font-size: 0.875rem; }
      </style>
      ${hasSlot
        ? '<slot></slot>'
        : (this.messages.length === 0
          ? '<div class="msg-empty">No messages yet</div>'
          : this.messages.map((msg) => this.renderMessage(msg)).join(''))
      }
    `;
    this.scrollToBottom();
  }

  private renderMessage(msg: ChatMessage): string {
    const role = msg.role || 'assistant';
    const content = this.escapeHtml(String(msg.content ?? ''));
    const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
    return `
      <div class="msg-row ${role}">
        <div class="msg-bubble ${role}">
          <div class="msg-label">${role}${ts ? ` / ${ts}` : ''}</div>
          <div>${content}</div>
        </div>
      </div>
    `;
  }

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
