import { UxBase } from '../../../../src/ui/widget/primitives/base';

interface Suggestion {
  type: 'mention' | 'tag';
  text: string;
}

export class UxChatComposer extends UxBase {
  private textarea: HTMLTextAreaElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private attachBtn: HTMLButtonElement | null = null;
  private attachInput: HTMLInputElement | null = null;
  private suggestEl: HTMLDivElement | null = null;
  private suggestions: Suggestion[] = [];
  private suggestIdx = -1;
  private files: File[] = [];
  private filesEl: HTMLDivElement | null = null;

  static get observedAttributes(): string[] {
    return ['placeholder', 'disabled', 'value', 'name', 'autofocus', 'mentions', 'tags', 'send-on', 'accept', 'max-files', 'max-file-size', 'autogrow', 'allow-attachments'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  protected onConnected(): void {
    super.onConnected();
    this.render();
    this.cacheDom();
    this.setupListeners();
    if (this.hasAttribute('autofocus') && this.getAttribute('autofocus') !== 'false') {
      setTimeout(() => this.textarea?.focus(), 50);
    }
  }

  protected onDisconnected(): void {
    this.textarea?.removeEventListener('keydown', this.onKeydown);
    this.textarea?.removeEventListener('input', this.onInput);
    this.textarea?.removeEventListener('blur', this.onBlur);
    this.textarea?.removeEventListener('paste', this.onPaste);
    this.sendBtn?.removeEventListener('click', this.onSend);
    this.attachBtn?.removeEventListener('click', this.onAttachClick);
    this.attachInput?.removeEventListener('change', this.onFilesChosen);
    super.onDisconnected();
  }

  private cacheDom() {
    const root = this.shadowRoot!;
    this.textarea = root.querySelector('textarea');
    this.sendBtn = root.querySelector('.send-btn');
    this.attachBtn = root.querySelector('.attach-btn');
    this.attachInput = root.querySelector('.attach-input');
    this.suggestEl = root.querySelector('.suggestions');
    this.filesEl = root.querySelector('.files');
  }

  private render() {
    if (!this.shadowRoot) return;
    const placeholder = this.getAttribute('placeholder') || 'Type a message...';
    const disabled = this.hasAttribute('disabled') ? 'disabled' : '';
    const value = this.getAttribute('value') || '';
    const name = this.getAttribute('name') || 'message';
    const accept = this.getAttribute('accept') || 'image/*,.pdf,.txt,.md,.csv,.json';
    const allowAttachments = this.hasAttribute('allow-attachments');
    const maxFiles = Number(this.getAttribute('max-files') || 10);
    const maxFileSize = Number(this.getAttribute('max-file-size') || 10485760);

    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <div class="suggestions" hidden part="suggestions"></div>
      <div class="files" part="files"></div>
      <div class="composer" part="composer">
        <button class="attach-btn" type="button" ${disabled} aria-label="Attach file" part="attach-btn" ${allowAttachments ? '' : 'hidden'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <input class="attach-input" type="file" multiple accept="${this.escapeHtml(accept)}" hidden ${allowAttachments ? '' : 'disabled'}>
        <textarea part="input" name="${name}" placeholder="${this.escapeHtml(placeholder)}" ${disabled} rows="1">${this.escapeHtml(value)}</textarea>
        <button class="send-btn" type="submit" ${disabled} aria-label="Send message" part="send-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </div>`;
  }

  private setupListeners() {
    this.textarea?.addEventListener('keydown', this.onKeydown);
    this.textarea?.addEventListener('input', this.onInput);
    this.textarea?.addEventListener('blur', this.onBlur);
    this.textarea?.addEventListener('paste', this.onPaste);
    this.sendBtn?.addEventListener('click', this.onSend);
    this.attachBtn?.addEventListener('click', this.onAttachClick);
    this.attachInput?.addEventListener('change', this.onFilesChosen);
    this.addEventListener('drop', this.onDrop);
    this.addEventListener('dragover', this.onDragOver);
    this.addEventListener('dragleave', this.onDragLeave);
  }

  private readonly onKeydown = (e: KeyboardEvent): void => {
    const sugg = this.suggestEl;
    if (sugg && !sugg.hidden && this.suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.moveSuggest(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.moveSuggest(-1); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault(); this.applySuggestion(); return;
      }
      if (e.key === 'Escape') { e.preventDefault(); this.hideSuggestions(); return; }
    }
    const sendOn = this.getAttribute('send-on') === 'ctrl-enter' ? 'ctrl-enter' : 'enter';
    if (e.key === 'Enter') {
      if (sendOn === 'enter' && !e.shiftKey) {
        e.preventDefault(); this.send();
      } else if (sendOn === 'ctrl-enter' && e.ctrlKey) {
        e.preventDefault(); this.send();
      }
    }
  };

  private readonly onInput = (): void => {
    this.autoResize();
    this.detectToken();
  };

  private readonly onBlur = (): void => {
    setTimeout(() => this.hideSuggestions(), 150);
  };

  private readonly onPaste = (e: ClipboardEvent): void => {
    if (!this.hasAttribute('allow-attachments')) return;
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    const items = Array.from(clipboardData.files || []);
    if (items.length === 0) return;
    e.preventDefault();
    this.addFiles(items);
  };

  private readonly onDrop = (e: DragEvent): void => {
    if (!this.hasAttribute('allow-attachments')) return;
    e.preventDefault();
    this.classList.remove('drag-over');
    const items = Array.from(e.dataTransfer?.files || []);
    if (items.length === 0) return;
    this.addFiles(items);
  };

  private readonly onDragOver = (e: DragEvent): void => {
    if (!this.hasAttribute('allow-attachments')) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
    this.classList.add('drag-over');
  };

  private readonly onDragLeave = (): void => {
    this.classList.remove('drag-over');
  };

  private addFiles(items: File[]): void {
    const maxFiles = Number(this.getAttribute('max-files') || 10);
    const maxFileSize = Number(this.getAttribute('max-file-size') || 10485760);
    for (const file of items) {
      if (this.files.length >= maxFiles) break;
      if (file.size > maxFileSize) continue;
      this.files.push(file);
    }
    this.renderFiles();
  }

  private readonly onSend = (e: Event): void => {
    e.preventDefault();
    this.send();
  };

  private readonly onAttachClick = (): void => {
    this.attachInput?.click();
  };

  private readonly onFilesChosen = (): void => {
    const input = this.attachInput;
    if (!input?.files?.length) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  };

  private renderFiles() {
    if (!this.filesEl) return;
    if (this.files.length === 0) { this.filesEl.innerHTML = ''; return; }
    this.filesEl.innerHTML = this.files.map((f, i) => `
      <span class="chip" part="file-chip">
        <span class="chip-name">${this.escapeHtml(f.name)}</span>
        <button class="chip-remove" data-idx="${i}" aria-label="Remove">&times;</button>
      </span>
    `).join('');
    this.filesEl.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.idx);
        this.files.splice(idx, 1);
        this.renderFiles();
      });
    });
  }

  private autoResize() {
    if (!this.textarea) return;
    this.textarea.style.height = 'auto';
    this.textarea.style.height = Math.min(this.textarea.scrollHeight, 160) + 'px';
  }

  private detectToken() {
    const val = this.textarea?.value ?? '';
    const cursor = this.textarea?.selectionStart ?? 0;
    const before = val.slice(0, cursor);
    const mentionMatch = before.match(/@(\w*)$/);
    const tagMatch = before.match(/#(\w*)$/);
    if (mentionMatch) {
      this.showSuggestions('mention', mentionMatch[1]);
    } else if (tagMatch) {
      this.showSuggestions('tag', tagMatch[1]);
    } else {
      this.hideSuggestions();
    }
  }

  private showSuggestions(type: 'mention' | 'tag', query: string) {
    let source = this.parseList(this.getAttribute(type === 'mention' ? 'mentions' : 'tags'));
    if (source.length === 0) {
      source = this.scanHistory(type);
    }
    if (source.length === 0) {
      if (type === 'mention') {
        source = ['assistant', 'agent', 'bot', 'system'];
      } else {
        source = ['important', 'todo', 'bug', 'feature', 'question'];
      }
    }
    const q = query.toLowerCase();
    this.suggestions = source.filter(s => s.toLowerCase().includes(q)).map(s => ({ type, text: s }));
    if (this.suggestions.length === 0) { this.hideSuggestions(); return; }
    this.suggestIdx = 0;
    if (!this.suggestEl) return;
    this.suggestEl.innerHTML = this.suggestions.map((s, i) =>
      `<div class="suggest-item${i === 0 ? ' active' : ''}" data-idx="${i}">${type === 'mention' ? '@' : '#'}${this.escapeHtml(s.text)}</div>`
    ).join('');
    this.suggestEl.hidden = false;
    this.positionSuggestions();
    this.suggestEl.querySelectorAll('.suggest-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.suggestIdx = Number((item as HTMLElement).dataset.idx);
        this.applySuggestion();
      });
    });
  }

  private positionSuggestions() {
    if (!this.suggestEl || !this.textarea) return;
    const rect = this.textarea.getBoundingClientRect();
    const top = rect.top - 8;
    const left = rect.left;
    const width = rect.width;
    this.suggestEl.style.position = 'fixed';
    this.suggestEl.style.top = 'auto';
    this.suggestEl.style.bottom = (window.innerHeight - top) + 'px';
    this.suggestEl.style.left = left + 'px';
    this.suggestEl.style.width = width + 'px';
    this.suggestEl.style.maxWidth = width + 'px';
  }

  private scanHistory(type: 'mention' | 'tag'): string[] {
    const messages = this.closest('ux-chat-messenger')?.querySelector('ux-chat-messages');
    if (!messages) return [];
    const seen = new Set<string>();
    const pattern = type === 'mention' ? /@(\w+)/g : /#(\w[\w-]*)/g;
    const text = messages.shadowRoot?.textContent || messages.textContent || '';
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const token = m[1].toLowerCase();
      if (token.length > 1 && !seen.has(token)) seen.add(token);
    }
    return [...seen].slice(0, 20);
  }

  private hideSuggestions() {
    this.suggestions = [];
    this.suggestIdx = -1;
    if (this.suggestEl) this.suggestEl.hidden = true;
  }

  private moveSuggest(dir: number) {
    if (!this.suggestEl || this.suggestions.length === 0) return;
    this.suggestIdx = (this.suggestIdx + dir + this.suggestions.length) % this.suggestions.length;
    const items = this.suggestEl.querySelectorAll('.suggest-item');
    items.forEach((el, i) => el.classList.toggle('active', i === this.suggestIdx));
    (this.suggestEl.querySelector('.suggest-item.active') as HTMLElement)?.scrollIntoView({ block: 'nearest' });
  }

  private applySuggestion() {
    const s = this.suggestions[this.suggestIdx];
    if (!s || !this.textarea) return;
    const val = this.textarea.value;
    const cursor = this.textarea.selectionStart;
    const before = val.slice(0, cursor);
    const after = val.slice(cursor);
    const prefix = s.type === 'mention' ? '@' : '#';
    const pattern = new RegExp(`${prefix === '@' ? '@' : '#'}(\\w*)$`);
    const newBefore = before.replace(pattern, prefix + s.text + ' ');
    this.textarea.value = newBefore + after;
    const newCursor = newBefore.length;
    this.textarea.selectionStart = this.textarea.selectionEnd = newCursor;
    this.hideSuggestions();
    this.autoResize();
    this.textarea?.focus();
  }

  private parseList(raw: string | null): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return raw.split(',').map(s => s.trim()).filter(Boolean); }
  }

  private send() {
    const value = this.textarea?.value?.trim() ?? '';
    if (!value && this.files.length === 0) return;
    const name = this.getAttribute('name') || 'message';
    const mentions = Array.from(value.match(/@(\w+)/g) || []).map(token => token.slice(1));
    const tags = Array.from(value.match(/#(\w[\w-]*)/g) || []).map(token => token.slice(1));
    const payload = {
      [name]: value,
      text: value,
      attachments: [...this.files],
      mentions,
      tags,
    };

    this.dispatchEvent(new CustomEvent('ux:chat.send', {
      bubbles: true,
      composed: true,
      detail: payload,
    }));
    this.dispatchEvent(new CustomEvent('ux:chat.submit', {
      bubbles: true,
      composed: true,
      detail: payload,
    }));

    if (this.textarea) {
      this.textarea.value = '';
      this.setAttribute('value', '');
      this.textarea.style.height = '';
    }
    this.files = [];
    this.renderFiles();
    this.hideSuggestions();
  }

  focus(): void {
    this.textarea?.focus();
  }

  reset(): void {
    if (this.textarea) {
      this.textarea.value = '';
      this.textarea.style.height = '';
      this.setAttribute('value', '');
    }
    this.files = [];
    this.renderFiles();
    this.hideSuggestions();
  }

  setText(text: string): void {
    if (!this.textarea) return;
    this.textarea.value = text;
    this.autoResize();
    this.setAttribute('value', text);
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  protected onAttributeChanged(name: string, _old: string | null, _new: string | null): void {
    if (!this.isConnected) return;
    if (name === 'value' && this.textarea && this.textarea !== document.activeElement) {
      this.textarea.value = this.getAttribute('value') || '';
      this.autoResize();
    }
    if (name === 'placeholder' && this.textarea) {
      this.textarea.placeholder = this.getAttribute('placeholder') || 'Type a message...';
    }
    if (name === 'disabled') {
      const dis = this.hasAttribute('disabled');
      if (this.textarea) this.textarea.disabled = dis;
      if (this.sendBtn) this.sendBtn.disabled = dis;
      if (this.attachBtn) this.attachBtn.disabled = dis;
    }
    if (['send-on', 'accept', 'allow-attachments'].includes(name) && this.isConnected) {
      this.render();
      this.cacheDom();
      this.setupListeners();
    }
  }

  protected applyData(data: any): void {
    if (typeof data === 'string') {
      this.setAttribute('value', data);
    } else if (data && typeof data === 'object') {
      if ('value' in data) this.setAttribute('value', String(data.value ?? ''));
      if (Array.isArray(data.mentions)) this.setAttribute('mentions', JSON.stringify(data.mentions));
      if (Array.isArray(data.tags)) this.setAttribute('tags', JSON.stringify(data.tags));
    }
  }

  private styles(): string {
    return `
      :host {
        display: block;
        flex-shrink: 0;
        box-sizing: border-box;
        position: relative;
      }
      :host(.drag-over)::after {
        content: 'Drop files here';
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: var(--color-primary, #7c3aed); color: var(--color-bg, #fff);
        border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600;
        z-index: 100; opacity: 0.9; pointer-events: none;
      }
      :host(.drag-over) .composer {
        border-color: var(--color-primary, #7c3aed);
        border-style: dashed;
      }
      .files {
        display: flex; flex-wrap: wrap; gap: 0.25rem;
        padding: 0 0.25rem 0.25rem;
      }
      .chip {
        display: inline-flex; align-items: center; gap: 0.125rem;
        background: var(--color-bg-muted, #f3f4f6);
        color: var(--color-text, #0f172a);
        border-radius: 0.375rem; padding: 0.125rem 0.375rem;
        font-size: 0.75rem; max-width: 12rem;
      }
      .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .chip-remove {
        border: none; background: none; cursor: pointer; padding: 0;
        font-size: 0.875rem; line-height: 1; color: var(--color-text-muted, #9ca3af);
      }
      .chip-remove:hover { color: var(--color-text, #0f172a); }
      .suggestions {
        border-radius: 0.5rem; border: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-bg, #fff);
        box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
        max-height: 10rem; overflow-y: auto; z-index: 1000;
        box-sizing: border-box;
      }
      .suggestions[hidden] { display: none; }
      .suggest-item {
        padding: 0.25rem 0.5rem; font-size: 0.75rem;
        color: var(--color-text, #0f172a); cursor: pointer;
        border-bottom: 1px solid var(--color-border-light, #f1f5f9);
      }
      .suggest-item:last-child { border-bottom: none; }
      .suggest-item.active, .suggest-item:hover { background: var(--color-bg-muted, #f3f4f6); }
      .composer {
        display: flex; align-items: flex-end; gap: 0.25rem;
        padding: 0.25rem 0.375rem;
        border-radius: 0.5rem;
        border: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-bg, #fff);
        transition: border-color 0.15s;
        box-sizing: border-box;
      }
      .composer:focus-within {
        border-color: var(--color-primary, #7c3aed);
        box-shadow: 0 0 0 1px var(--color-primary, #7c3aed);
      }
      .attach-input { display: none; }
      textarea {
        flex: 1; border: none; outline: none; resize: none;
        background: transparent; color: var(--color-text, #0f172a);
        font: inherit; font-size: 0.8125rem; line-height: 1.5;
        padding: 0.125rem 0; min-height: 1.25rem; max-height: 8rem;
        overflow-y: hidden; scrollbar-width: none; box-sizing: border-box;
      }
      textarea::-webkit-scrollbar { display: none; }
      textarea::placeholder { color: var(--color-text-muted, #9ca3af); font-size: 0.8125rem; }
      textarea:disabled { opacity: 0.5; cursor: not-allowed; }
      .attach-btn, .send-btn {
        flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        width: 1.625rem; height: 1.625rem; border: none; border-radius: 0.375rem;
        cursor: pointer; transition: background 0.15s, opacity 0.15s;
        padding: 0; background: transparent;
      }
      .attach-btn { color: var(--color-text-muted, #9ca3af); }
      .attach-btn:hover { color: var(--color-text, #0f172a); background: var(--color-bg-muted, #f3f4f6); }
      .send-btn { background: var(--color-primary, #7c3aed); color: var(--color-bg, #fff); }
      .send-btn:hover { background: var(--color-primary-hover, #6d28d9); }
      .send-btn:disabled, .attach-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .send-btn svg, .attach-btn svg { width: 0.875rem; height: 0.875rem; }
    `;
  }
}
