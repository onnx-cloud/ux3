import { UxBase } from './base.js';

export class UxWysiwyg extends UxBase {
  private _onSelectionChange: (() => void) | null = null;
  private _toolbarButtons: NodeListOf<HTMLButtonElement> | null = null;

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onDisconnected(): void {
    if (this._onSelectionChange) {
      document.removeEventListener('selectionchange', this._onSelectionChange);
      this._onSelectionChange = null;
    }
    super.onDisconnected();
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
        button[data-cmd].active { background: var(--ux-color-surface, #fff); border-color: var(--ux-color-accent, #3b82f6); }
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
        .editor img { max-width: 100%; }
      </style>
      <div class="toolbar" part="toolbar">
        <button type="button" data-cmd="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" data-cmd="italic" title="Italic (Ctrl+I)"><em>I</em></button>
        <button type="button" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <button type="button" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
        <span style="width:1px;background:#cbd5e1;margin:0 0.25rem"></span>
        <select data-cmd="formatBlock" title="Heading">
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
          <option value="p">P</option>
          <option value="pre">Code</option>
        </select>
        <span style="width:1px;background:#cbd5e1;margin:0 0.25rem"></span>
        <button type="button" data-cmd="justifyLeft" title="Align left">\u2AF7</button>
        <button type="button" data-cmd="justifyCenter" title="Align center">\u2263</button>
        <button type="button" data-cmd="justifyRight" title="Align right">\u2AF8</button>
        <span style="width:1px;background:#cbd5e1;margin:0 0.25rem"></span>
        <button type="button" data-cmd="insertOrderedList" title="Ordered list">1.</button>
        <button type="button" data-cmd="insertUnorderedList" title="Unordered list">\u2022</button>
        <button type="button" data-cmd="indent" title="Indent">\u21B3</button>
        <button type="button" data-cmd="outdent" title="Outdent">\u21B0</button>
        <span style="width:1px;background:#cbd5e1;margin:0 0.25rem"></span>
        <button type="button" data-cmd="insertTable" title="Insert table">\u229E</button>
        <button type="button" data-cmd="insertHorizontalRule" title="Horizontal rule">&mdash;</button>
        <span style="width:1px;background:#cbd5e1;margin:0 0.25rem"></span>
        <button type="button" data-cmd="insertImage" title="Insert image">\uD83D\uDDBC</button>
      </div>
      <div class="editor" contenteditable="true" part="editor" role="textbox" aria-multiline="true"></div>
    `;

    const editor = this.shadowRoot.querySelector('.editor') as HTMLDivElement;
    if (!editor) return;

    if (initialValue) editor.innerHTML = initialValue;

    const emitChange = () => {
      this.updateToolbarState();
      const html = editor.innerHTML;
      this.setAttribute('value', html);
      this.dispatchEvent(new CustomEvent('ux:editor.change', { bubbles: true, detail: { value: html } }));
    };

    editor.addEventListener('input', emitChange);
    editor.addEventListener('keyup', () => this.updateToolbarState());
    editor.addEventListener('mouseup', () => this.updateToolbarState());

    document.addEventListener('selectionchange', this._onSelectionChange = () => {
      if (document.activeElement === editor || editor.contains(document.activeElement)) {
        this.updateToolbarState();
      }
    });

    const toolbar = this.shadowRoot.querySelector('.toolbar')!;
    this._toolbarButtons = toolbar.querySelectorAll('button[data-cmd]') as NodeListOf<HTMLButtonElement>;
    this._toolbarButtons.forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        editor.focus();
        const cmd = (btn as HTMLElement).dataset.cmd || '';
        if (cmd === 'insertImage') {
          this.insertImage(editor, emitChange);
          return;
        }
        if (cmd === 'insertTable') {
          this.insertTable(editor, emitChange);
          return;
        }
        document.execCommand(cmd);
        emitChange();
      });
    });

    toolbar.querySelectorAll('select[data-cmd]').forEach((sel) => {
      sel.addEventListener('change', () => {
        editor.focus();
        const cmd = (sel as HTMLSelectElement).dataset.cmd || '';
        const value = (sel as HTMLSelectElement).value;
        document.execCommand(cmd, false, value);
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

  private updateToolbarState(): void {
    if (!this._toolbarButtons) return;
    this._toolbarButtons.forEach((btn) => {
      const cmd = (btn as HTMLElement).dataset.cmd || '';
      if (['bold','italic','underline','strikeThrough','insertOrderedList','insertUnorderedList','justifyLeft','justifyCenter','justifyRight'].includes(cmd)) {
        btn.classList.toggle('active', document.queryCommandState(cmd));
      }
    });
  }

  private insertTable(editor: HTMLDivElement, emitChange: () => void): void {
    const rows = 3;
    const cols = 3;
    let html = '<table style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #d1d5db;padding:0.5rem;min-width:3rem">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    document.execCommand('insertHTML', false, html);
    emitChange();
  }

  private insertImage(editor: HTMLDivElement, emitChange: () => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.focus();
        document.execCommand('insertImage', false, reader.result as string);
        emitChange();
         this.dispatchEvent(new CustomEvent('ux:editor.action', {
          bubbles: true, composed: true,
          detail: { action: 'WYSIWYG:IMAGE', dataUrl: reader.result },
        }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
}
