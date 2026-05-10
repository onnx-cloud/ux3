import { UxBase } from './base.js';

const STYLE_ID = 'ux-textarea-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ux-textarea { display: inline-block; width: 100%; }
    ux-textarea textarea {
      width: 100%;
      box-sizing: border-box;
      padding: var(--ux-textarea-padding, 0.5rem 0.625rem);
      border: var(--ux-textarea-border, 1px solid var(--ux-color-border, #cbd5e1));
      border-radius: var(--ux-textarea-radius, 0.375rem);
      background: var(--ux-textarea-bg, #ffffff);
      color: var(--ux-textarea-text, #0f172a);
      font: inherit;
      resize: var(--ux-textarea-resize, vertical);
    }
    ux-textarea textarea:focus-visible {
      outline: var(--ux-textarea-focus-ring, 2px solid var(--ux-color-accent, #2563eb));
      outline-offset: var(--ux-textarea-focus-offset, 1px);
    }
  `;
  document.head.appendChild(style);
}

export class UxTextarea extends UxBase {
  private textareaEl: HTMLTextAreaElement | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'rows', 'disabled'];
  }

  protected onConnected(): void {
    super.onConnected();
    ensureStyles();
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
  }

  protected onAttributeChanged(name: string): void {
    if (!this.isConnected) return;
    if (name === 'value') {
      if (this.textareaEl && this.textareaEl !== document.activeElement) {
        this.textareaEl.value = this.getAttribute('value') ?? '';
      }
      return;
    }
    this.render();
  }

  private render(): void {
    if (this.textareaEl) {
      this.updateAttributes();
      return;
    }

    const value = this.getAttribute('value') ?? '';
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const rows = this.getAttribute('rows') ?? '4';
    const disabled = this.hasAttribute('disabled');

    const el = document.createElement('textarea');
    el.rows = parseInt(rows, 10) || 4;
    el.placeholder = placeholder;
    el.name = name;
    el.textContent = value;
    if (disabled) el.disabled = true;
    el.setAttribute('part', 'textarea');

    this.appendChild(el);
    this.textareaEl = el;

    el.addEventListener('input', this.onInput);
  }

  private updateAttributes(): void {
    if (!this.textareaEl) return;
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const rows = parseInt(this.getAttribute('rows') ?? '4', 10) || 4;
    this.textareaEl.placeholder = placeholder;
    this.textareaEl.name = name;
    this.textareaEl.rows = rows;
    this.textareaEl.disabled = this.hasAttribute('disabled');
  }

  private readonly onInput = (event: Event): void => {
    const value = (event.target as HTMLTextAreaElement).value;
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { value },
    }));
  };
}
