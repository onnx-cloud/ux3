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
  private contextRow: HTMLElement | null = null;

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
    this.shadowRoot?.addEventListener('click', this.onBubbleClick);
    document.addEventListener('click', this.onDocClick);
    this.addEventListener('ux:context-action', this.onContextAction);
  }

  protected onDisconnected(): void {
    this.shadowRoot?.removeEventListener('contextmenu', this.onContextMenu);
    this.shadowRoot?.removeEventListener('click', this.onBubbleClick);
    document.removeEventListener('click', this.onDocClick);
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
    try { this.messages = JSON.parse(raw); } catch { this.messages = []; }
  }

  private render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      ${this.messages.length === 0
        ? '<div class="ux-chat-message-empty">No messages yet</div>'
        : this.messages.map((msg, i) => this.renderMessage(msg, i)).join('')}
    `;
    this.scrollToBottom();
  }

  protected getStyles(): string {
    return `
      :host {
        display: flex; flex-direction: column; gap: 0;
        overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth;
        flex: 1; min-height: 0;
      }
      :host::-webkit-scrollbar { width: 3px; }
      :host::-webkit-scrollbar-thumb { background: var(--color-border, #d1d5db); border-radius: 1.5px; }
      :host::-webkit-scrollbar-track { background: transparent; }
      .ux-chat-message-row {
        display: flex; flex-direction: column; align-items: stretch; position: relative;
        padding: 0.125rem 0;
      }
      .ux-chat-message-row:first-child { padding-top: 0; }
      .ux-chat-message-row[data-role="user"]      { align-items: flex-end; }
      .ux-chat-message-row[data-role="assistant"]  { align-items: flex-start; }
      .ux-chat-message-row[data-role="system"]     { align-items: center; }
      .ux-chat-message-row[data-role="tool"]       { align-items: flex-start; }
      .ux-chat-message-bubble {
        position: relative; display: inline-block; cursor: default;
        max-width: var(--ux-chat-message-max-w, 88%);
        padding: 0.0rem 0.0rem;
        border-radius: 0.1rem;
        font-size: 0.75rem; line-height: 1.1;
        white-space: pre-wrap; word-break: break-word;
        transition: background 0.15s;
      }
      .ux-chat-message-bubble[data-role="user"]      { background: var(--color-bg-muted, #f3f4f6); color: var(--color-text, #0f172a); border-bottom-right-radius: 0.125rem; }
      .ux-chat-message-bubble[data-role="assistant"]  { background: var(--color-bg, #fff); color: var(--color-text, #0f172a); border: 1px solid var(--color-border, #e2e8f0); border-bottom-left-radius: 0.125rem; }
      .ux-chat-message-bubble[data-role="system"]     { background: var(--color-bg-muted, #f8fafc); color: var(--color-text-muted, #6b7280); font-style: italic; font-size: 0.7rem; }
      .ux-chat-message-bubble[data-role="tool"]       { background: var(--color-bg-muted, #f8fafc); color: var(--color-text, #0f172a); font-family: monospace; font-size: 0.7rem; border-left: 2px solid var(--color-border, #d1d5db); }
      .ux-chat-message-bubble.selected { background: var(--color-bg-muted, #e2e8f0); }
      .ux-chat-message-bubble .inline-menu {
        display: none; position: absolute; top: -0.5rem;
        background: var(--color-bg, #fff);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 0.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        z-index: 10; padding: 0.125rem 0; font-size: 0.6875rem;
        white-space: nowrap;
      }
      .ux-chat-message-row[data-role="user"] .inline-menu      { right: 0; }
      .ux-chat-message-row[data-role="assistant"] .inline-menu  { left: 0; }
      .ux-chat-message-row:hover .inline-menu,
      .ux-chat-message-bubble.selected .inline-menu { display: flex; }
      .inline-menu button {
        display: flex; align-items: center; gap: 0.25rem;
        border: none; background: none; cursor: pointer;
        padding: 0.25rem 0.5rem; color: var(--color-text, #0f172a);
        font-size: inherit; line-height: 1.4;
      }
      .inline-menu button:hover { background: var(--color-bg-muted, #f3f4f6); }
      .inline-menu button.danger { color: var(--color-error, #dc2626); }
      .inline-menu .divider { width: 1px; background: var(--color-border, #e2e8f0); margin: 0 0.125rem; align-self: stretch; }
      .ux-chat-message-time {
        position: absolute; bottom: 0; right: 0.2rem;
        font-size: 0.5rem; line-height: 1;
        color: var(--color-text-muted, #9ca3af);
        opacity: 0; transition: opacity 0.15s;
        padding: 0.05rem 0.15rem; pointer-events: none;
      }
      .ux-chat-message-row:hover .ux-chat-message-time { opacity: 0.7; }
      .ux-chat-message-empty {
        text-align: center; color: var(--color-muted, #64748b);
        padding: 1.5rem 1rem; font-size: 0.8125rem;
        flex: 1; display: flex; align-items: center; justify-content: center;
      }
    `;
  }

  private renderMessage(msg: ChatMessage, idx: number): string {
    const role = msg.role || 'assistant';
    const content = this.escapeHtml(String(msg.content ?? ''));
    const ts = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    return `
      <div class="ux-chat-message-row" data-role="${role}" data-idx="${idx}">
        <div class="ux-chat-message-bubble" data-role="${role}">
          <span class="inline-menu" data-idx="${idx}">
            <button data-action="copy" title="Copy">Copy</button>
            <span class="divider"></span>
            <button data-action="delete" class="danger" title="Delete">Delete</button>
          </span>
          ${content}${ts ? `<span class="ux-chat-message-time">${ts}</span>` : ''}
        </div>
      </div>`;
  }

  private readonly onContextAction = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail?.action) return;
    const action = detail.action as string;
    const source = detail.source as { index: number; content: string; role: string };
    switch (action) {
      case 'copy': {
        if (source?.content) navigator.clipboard?.writeText(source.content).catch(() => {});
        break;
      }
      case 'delete': {
        if (source?.index != null) {
          const next = [...this.messages];
          next.splice(source.index, 1);
          this.setMessages(next);
        }
        break;
      }
      case 'regenerate': {
        this.sendToFSM('REGENERATE', { index: source?.index });
        break;
      }
    }
  };

  private readonly onBubbleClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button[data-action]') as HTMLButtonElement;
    if (!btn) return;
    const action = btn.dataset.action!;
    const idx = Number((btn.closest('.inline-menu') as HTMLElement)?.dataset.idx);
    const msg = this.messages[idx];
    if (!msg) return;
    this.closeInlineMenu();
    switch (action) {
      case 'copy':
        if (msg.content) navigator.clipboard?.writeText(msg.content).catch(() => {});
        break;
      case 'delete': {
        const next = [...this.messages];
        next.splice(idx, 1);
        this.setMessages(next);
        break;
      }
      case 'regenerate':
        this.sendToFSM('REGENERATE', { index: idx });
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
    e.stopPropagation();
    this.closeInlineMenu();
    const bubble = (e.target as HTMLElement).closest('.ux-chat-message-bubble') as HTMLElement;
    if (!bubble) return;
    bubble.classList.add('selected');
    this.contextRow = bubble;
  };

  private readonly onDocClick = (e: MouseEvent) => {
    if (this.contextRow && !this.contextRow.contains(e.target as Node)) {
      this.closeInlineMenu();
    }
  };

  private closeInlineMenu() {
    if (this.contextRow) {
      this.contextRow.classList.remove('selected');
      this.contextRow = null;
    }
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.shadowRoot?.host as HTMLElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
}
