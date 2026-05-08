import { UxBase } from './base.js';

export class UxWysiwyg extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const initialValue = this.getAttribute('value') || this.innerHTML || '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .toolbar {
          display: var(--ux-toolbar-display, flex);
          gap: var(--ux-toolbar-gap, 0.25rem);
          padding: var(--ux-toolbar-padding, 0.375rem 0.5rem);
          border: var(--ux-toolbar-border, 1px solid var(--ux-color-border, #cbd5e1));
          border-bottom: none;
          border-radius: var(--ux-toolbar-radius, 0.375rem 0.375rem 0 0);
          background: var(--ux-toolbar-bg, var(--ux-color-surface-alt, #f8fafc));
          flex-wrap: wrap;
        }
        button {
          background: none;
          border: 1px solid transparent;
          border-radius: var(--ux-radius-sm, 0.25rem);
          padding: 0.125rem 0.375rem;
          cursor: pointer;
          font: inherit;
          font-size: var(--ux-font-size, 0.875rem);
          color: var(--ux-color-text, #0f172a);
        }
        button:hover { background: var(--ux-color-surface, #fff); border-color: var(--ux-color-border, #cbd5e1); }
        .editor {
          min-height: var(--ux-wysiwyg-height, 8rem);
          padding: var(--ux-wysiwyg-padding, 0.625rem 0.75rem);
          border: 1px solid var(--ux-color-border, #cbd5e1);
          border-radius: 0 0 var(--ux-radius, 0.375rem) var(--ux-radius, 0.375rem);
          background: var(--ux-color-surface, #fff);
          color: var(--ux-color-text, #0f172a);
          font: inherit;
          line-height: var(--ux-wysiwyg-line-height, 1.6);
          outline: none;
        }
        .editor:focus { outline: var(--ux-wysiwyg-focus-ring, 2px solid var(--ux-color-accent, #2563eb)); outline-offset: -1px; }
      </style>
      <div class="toolbar" part="toolbar">
        <button type="button" data-cmd="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" data-cmd="italic" title="Italic (Ctrl+I)"><em>I</em></button>
        <button type="button" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <button type="button" data-cmd="insertOrderedList" title="Ordered list">OL</button>
        <button type="button" data-cmd="insertUnorderedList" title="Unordered list">UL</button>
      </div>
      <div class="editor" contenteditable="true" part="editor" role="textbox" aria-multiline="true"></div>
    `;

    const editor = this.shadowRoot.querySelector('.editor') as HTMLDivElement;
    if (!editor) return;

    if (initialValue) editor.innerHTML = initialValue;

    const emitChange = () => {
      const html = editor.innerHTML;
      this.setAttribute('value', html);
      this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { value: html } }));
    };

    editor.addEventListener('input', emitChange);

    const toolbar = this.shadowRoot.querySelector('.toolbar')!;
    toolbar.querySelectorAll('button[data-cmd]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        editor.focus();
        document.execCommand((btn as HTMLElement).dataset.cmd || '');
        emitChange();
      });
    });

    editor.addEventListener('keydown', (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      let cmd = '';
      switch (e.key) {
        case 'b': cmd = 'bold'; break;
        case 'i': cmd = 'italic'; break;
        case 'u': cmd = 'underline'; break;
      }
      if (cmd) {
        e.preventDefault();
        document.execCommand(cmd);
        emitChange();
      }
    });
  }
}
