import { UxBase } from '../../../../src/ui/widget/primitives/base';

interface ChatMessagePart {
  type: 'text' | 'tool_call' | 'tool_result' | 'markdown' | 'code' | 'image';
  text?: string;
  toolName?: string;
  toolCallId?: string;
  args?: string;
  result?: string;
  language?: string;
  src?: string;
  alt?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'tool_call' | 'tool_result';
  content: string | Record<string, unknown>;
  parts?: ChatMessagePart[];
  id?: string;
  token_count?: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
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
    this.shadowRoot?.addEventListener('contextmenu', this.onMsgContextMenu);
  }

  protected onDisconnected(): void {
    this.shadowRoot?.removeEventListener('contextmenu', this.onMsgContextMenu);
    this.shadowRoot?.removeEventListener('click', this.onBubbleClick);
    document.removeEventListener('click', this.onDocClick);
    this.removeEventListener('ux:menu.action', this.onContextAction);
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
    this.shadowRoot.innerHTML = '';

    const style = this.createStyleElement();
    this.shadowRoot.appendChild(style);

    if (this.messages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ux-chat-message-empty';
      empty.textContent = 'No messages yet';
      this.shadowRoot.appendChild(empty);
    } else {
      for (let i = 0; i < this.messages.length; i++) {
        const row = this.buildMessageRow(this.messages[i], i);
        this.shadowRoot.appendChild(row);
      }
    }
    this.scrollToBottom();
  }

  private buildMessageRow(msg: ChatMessage, idx: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'ux-chat-message-row';
    row.dataset.role = msg.role || 'assistant';
    row.dataset.idx = String(idx);

    const bubble = document.createElement('div');
    bubble.className = 'ux-chat-message-bubble';
    bubble.dataset.role = msg.role || 'assistant';

    const inlineMenu = this.buildInlineMenu(idx);
    bubble.appendChild(inlineMenu);

    const parts = this.resolveParts(msg);
    for (const part of parts) {
      bubble.appendChild(this.buildPartElement(part));
    }

    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    if (parts.length === 0 && content) {
      const textEl = document.createElement('span');
      textEl.className = 'ux-chat-message-text';
      textEl.textContent = content;
      bubble.appendChild(textEl);
    }

    const ts = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    if (ts) {
      const timeEl = document.createElement('span');
      timeEl.className = 'ux-chat-message-time';
      timeEl.textContent = ts;
      bubble.appendChild(timeEl);
    }

    row.appendChild(bubble);
    return row;
  }

  private resolveParts(msg: ChatMessage): ChatMessagePart[] {
    if (msg.parts && msg.parts.length > 0) return msg.parts;

    if (msg.role === 'tool_call') {
      const c = msg.content as Record<string, unknown>;
      return [{
        type: 'tool_call',
        toolName: (c.name as string) || 'unknown',
        toolCallId: (c.id as string) || undefined,
        args: c.args ? JSON.stringify(c.args) : undefined,
      }];
    }

    if (msg.role === 'tool_result') {
      return [{
        type: 'tool_result',
        toolName: (msg.metadata?.toolName as string) || 'unknown',
        toolCallId: (msg.metadata?.toolCallId as string) || undefined,
        result: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }];
    }

    return [];
  }

  private buildPartElement(part: ChatMessagePart): HTMLElement {
    switch (part.type) {
      case 'tool_call':
        return this.buildToolCallPill(part);
      case 'tool_result':
        return this.buildToolResultPill(part);
      case 'code':
        return this.buildCodeBlock(part);
      case 'markdown':
        return this.buildMarkdownContent(part);
      case 'image':
        return this.buildImageContent(part);
      default:
        return this.buildTextContent(part);
    }
  }

  private buildToolCallPill(part: ChatMessagePart): HTMLElement {
    const pill = document.createElement('div');
    pill.className = 'ux-chat-tool-pill tool-call';
    pill.title = `Tool: ${part.toolName}`;

    const icon = document.createElement('span');
    icon.className = 'tool-pill-icon';
    icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
    pill.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'tool-pill-label';
    label.textContent = `call ${part.toolName}`;
    pill.appendChild(label);

    if (part.args) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'tool-pill-expand';
      expandBtn.textContent = '▸';
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const detail = pill.querySelector('.tool-pill-detail') as HTMLElement;
        if (detail) {
          const hidden = detail.hidden;
          detail.hidden = !hidden;
          expandBtn.textContent = hidden ? '▾' : '▸';
        }
      });
      pill.appendChild(expandBtn);

      const detail = document.createElement('pre');
      detail.className = 'tool-pill-detail';
      detail.hidden = true;
      detail.textContent = part.args;
      pill.appendChild(detail);
    }

    return pill;
  }

  private buildToolResultPill(part: ChatMessagePart): HTMLElement {
    const pill = document.createElement('div');
    pill.className = 'ux-chat-tool-pill tool-result';

    const icon = document.createElement('span');
    icon.className = 'tool-pill-icon';
    icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    pill.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'tool-pill-label';
    const name = part.toolName || 'tool';
    label.textContent = `result ${name}`;
    pill.appendChild(label);

    if (part.result) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'tool-pill-expand';
      expandBtn.textContent = '▸';
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const detail = pill.querySelector('.tool-pill-detail') as HTMLElement;
        if (detail) {
          const hidden = detail.hidden;
          detail.hidden = !hidden;
          expandBtn.textContent = hidden ? '▾' : '▸';
        }
      });
      pill.appendChild(expandBtn);

      const detail = document.createElement('pre');
      detail.className = 'tool-pill-detail';
      detail.hidden = true;
      const truncated = part.result.length > 2000
        ? part.result.slice(0, 2000) + '\n... (truncated)'
        : part.result;
      detail.textContent = truncated;
      pill.appendChild(detail);
    }

    return pill;
  }

  private buildCodeBlock(part: ChatMessagePart): HTMLElement {
    const block = document.createElement('pre');
    block.className = 'ux-chat-code-block';

    if (part.language) {
      const lang = document.createElement('div');
      lang.className = 'code-lang';
      lang.textContent = part.language;
      block.appendChild(lang);
    }

    const code = document.createElement('code');
    code.textContent = part.text || '';
    block.appendChild(code);
    return block;
  }

  private buildMarkdownContent(part: ChatMessagePart): HTMLElement {
    const div = document.createElement('div');
    div.className = 'ux-chat-markdown';
    const text = part.text || '';
    div.innerHTML = this.sanitizeContent(this.renderBasicMarkdown(text));
    return div;
  }

  private buildImageContent(part: ChatMessagePart): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'ux-chat-image';
    const img = document.createElement('img');
    img.src = part.src || '';
    img.alt = part.alt || '';
    img.loading = 'lazy';
    wrapper.appendChild(img);
    return wrapper;
  }

  private buildTextContent(part: ChatMessagePart): HTMLElement {
    const span = document.createElement('span');
    span.className = 'ux-chat-message-text';
    span.textContent = part.text || '';
    return span;
  }

  private buildInlineMenu(idx: number): HTMLElement {
    const menu = document.createElement('span');
    menu.className = 'inline-menu';
    menu.dataset.idx = String(idx);

    const copyBtn = document.createElement('button');
    copyBtn.dataset.action = 'copy';
    copyBtn.title = 'Copy';
    copyBtn.textContent = 'Copy';
    menu.appendChild(copyBtn);

    const divider = document.createElement('span');
    divider.className = 'divider';
    menu.appendChild(divider);

    const deleteBtn = document.createElement('button');
    deleteBtn.dataset.action = 'delete';
    deleteBtn.className = 'danger';
    deleteBtn.title = 'Delete';
    deleteBtn.textContent = 'Delete';
    menu.appendChild(deleteBtn);

    return menu;
  }

  private renderBasicMarkdown(text: string): string {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m: string, lang: string, code: string) => {
      const escaped = code;
      return `<pre class="ux-chat-code-block"><code>${escaped}</code></pre>`;
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  private sanitizeContent(html: string): string {
    const allowed = new Set(['br', 'strong', 'em', 'code', 'pre', 'h1', 'h2', 'h3', 'ul', 'li', 'p', 'a', 'img']);
    return html.replace(/<\/?(\w+)[^>]*>/g, (match: string, tag: string) => {
      if (allowed.has(tag.toLowerCase())) return match;
      return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    });
  }

  private readonly onContextAction = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail?.action) return;
    const action = detail.action as string;
    const source = detail.source as { index: number; content: string; role: string };
    switch (action) {
      case 'copy':
        if (source?.content) navigator.clipboard?.writeText(source.content).catch(() => {});
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
        if (msg.content) navigator.clipboard?.writeText(
          typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        ).catch(() => {});
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
    this.dispatchEvent(new CustomEvent('ux:chat.message.select', {
      bubbles: true, composed: true,
      detail: { value: msgs },
    }));
  }

  private readonly onMsgContextMenu = (e: MouseEvent) => {
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

  private createStyleElement(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        --chat-tool-call-bg: #fef9c3; --chat-tool-call-text: #854d0e; --chat-tool-call-accent: #eab308;
        --chat-tool-result-bg: #f0fdf4; --chat-tool-result-text: #166534; --chat-tool-result-accent: #22c55e;
      }
      :host::-webkit-scrollbar { width: 3px; }
      :host::-webkit-scrollbar-thumb { background: var(--color-border, #d1d5db); border-radius: 1.5px; }
      :host::-webkit-scrollbar-track { background: transparent; }

      .ux-chat-message-row {
        display: flex; flex-direction: column; align-items: stretch; position: relative;
        padding: 0.125rem 0.25rem;
      }
      .ux-chat-message-row[data-role="user"]      { align-items: flex-end; }
      .ux-chat-message-row[data-role="assistant"]  { align-items: flex-start; }
      .ux-chat-message-row[data-role="system"]     { align-items: center; }
      .ux-chat-message-row[data-role="tool"]       { align-items: flex-start; }
      .ux-chat-message-row[data-role="tool_call"]  { align-items: flex-start; }
      .ux-chat-message-row[data-role="tool_result"] { align-items: flex-start; }

      .ux-chat-message-bubble {
        position: relative; display: inline-flex; flex-direction: column; gap: 0.25rem;
        cursor: default;
        max-width: var(--ux-chat-message-max-w, 88%);
        padding: 0.25rem 0.375rem;
        border-radius: 0.375rem;
        font-size: 0.75rem; line-height: 1.35;
        white-space: pre-wrap; word-break: break-word;
        transition: background 0.15s;
      }
      .ux-chat-message-bubble[data-role="user"]      { background: var(--color-bg-muted, #f3f4f6); color: var(--color-text, #0f172a); border-bottom-right-radius: 0.125rem; }
      .ux-chat-message-bubble[data-role="assistant"]  { background: var(--color-bg, #fff); color: var(--color-text, #0f172a); border: 1px solid var(--color-border, #e2e8f0); border-bottom-left-radius: 0.125rem; }
      .ux-chat-message-bubble[data-role="system"]     { background: var(--color-bg-muted, #f8fafc); color: var(--color-text-muted, #6b7280); font-style: italic; font-size: 0.7rem; }
      .ux-chat-message-bubble[data-role="tool"]       { background: var(--color-bg-muted, #f8fafc); color: var(--color-text, #0f172a); font-family: monospace; font-size: 0.7rem; border-left: 2px solid var(--color-border, #d1d5db); }
      .ux-chat-message-bubble[data-role="tool_call"]  { background: var(--chat-tool-call-bg, #fef9c3); color: var(--chat-tool-call-text, #854d0e); border-left: 2px solid var(--chat-tool-call-accent, #eab308); font-size: 0.7rem; }
      .ux-chat-message-bubble[data-role="tool_result"] { background: var(--chat-tool-result-bg, #f0fdf4); color: var(--chat-tool-result-text, #166534); border-left: 2px solid var(--chat-tool-result-accent, #22c55e); font-size: 0.7rem; }
      .ux-chat-message-bubble.selected { background: var(--color-bg-muted, #e2e8f0); }

      .ux-chat-message-text {
        white-space: pre-wrap; word-break: break-word;
      }

      .ux-chat-tool-pill {
        display: flex; align-items: flex-start; gap: 0.25rem;
        padding: 0.125rem 0.375rem; border-radius: 0.25rem;
        font-family: monospace; font-size: 0.6875rem;
        flex-wrap: wrap;
      }
      .ux-chat-tool-pill.tool-call { background: var(--chat-tool-call-bg, #fef08a); color: var(--chat-tool-call-text, #713f12); }
      .ux-chat-tool-pill.tool-result { background: var(--chat-tool-result-bg, #bbf7d0); color: var(--chat-tool-result-text, #14532d); }
      .tool-pill-icon { display: flex; flex-shrink: 0; margin-top: 1px; }
      .tool-pill-label { font-weight: 500; }
      .tool-pill-expand {
        border: none; background: none; cursor: pointer; padding: 0 0.125rem;
        font-size: 0.625rem; color: inherit; opacity: 0.7;
      }
      .tool-pill-expand:hover { opacity: 1; }
      .tool-pill-detail {
        width: 100%; margin: 0.125rem 0 0; padding: 0.25rem;
        background: rgba(0,0,0,0.05); border-radius: 0.125rem;
        font-size: 0.625rem; white-space: pre-wrap; word-break: break-all;
        max-height: 10rem; overflow-y: auto;
      }

      .ux-chat-code-block {
        background: var(--color-bg-muted, #f8fafc); border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 0.25rem; padding: 0.25rem 0.375rem; margin: 0.125rem 0;
        font-family: monospace; font-size: 0.6875rem; overflow-x: auto;
        position: relative;
      }
      .code-lang {
        position: absolute; top: 0.0625rem; right: 0.25rem;
        font-size: 0.5625rem; color: var(--color-text-muted, #9ca3af);
      }

      .ux-chat-markdown { white-space: normal; }
      .ux-chat-markdown h1, .ux-chat-markdown h2, .ux-chat-markdown h3 {
        margin: 0.25rem 0; font-size: 0.8125rem; font-weight: 600;
      }
      .ux-chat-markdown ul { margin: 0.125rem 0; padding-left: 1rem; }
      .ux-chat-markdown li { margin: 0.0625rem 0; }
      .ux-chat-markdown code {
        background: var(--color-bg-muted, #f3f4f6); padding: 0.0625rem 0.25rem;
        border-radius: 0.125rem; font-size: 0.6875rem;
      }
      .ux-chat-markdown pre code { background: none; padding: 0; }
      .ux-chat-markdown strong { font-weight: 600; }

      .ux-chat-image img {
        max-width: 100%; max-height: 16rem; border-radius: 0.25rem;
      }

      .ux-chat-message-bubble .inline-menu {
        display: none; position: absolute; top: -0.5rem;
        background: var(--color-bg, #fff);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.12);
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
        position: absolute; bottom: 0.0625rem; right: 0.25rem;
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
    return style;
  }
}
