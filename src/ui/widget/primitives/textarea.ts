import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-textarea-style';
const STYLE_CSS = `    ux-textarea { display: inline-block; width: 100%; }
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
    }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxTextarea extends UxBase {
  private textareaEl: HTMLTextAreaElement | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'rows', 'disabled'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.syncAttrs();
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
  }

  protected applyData(data: any): void {
    if (typeof data === 'string' || typeof data === 'number') {
      this.setAttribute('value', String(data));
    } else if (data && typeof data === 'object') {
      if ('value' in data) this.setAttribute('value', String(data.value ?? ''));
      if ('placeholder' in data) this.setAttribute('placeholder', String(data.placeholder ?? ''));
      if ('name' in data) this.setAttribute('name', String(data.name ?? ''));
      if ('rows' in data) this.setAttribute('rows', String(data.rows ?? ''));
      if (data.disabled != null) data.disabled ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
    }
    this.syncAttrs();
  }

  private syncAttrs(): void {
    if (!this.textareaEl) return;
    this.textareaEl.value = this.getAttribute('value') ?? '';
    this.textareaEl.placeholder = this.getAttribute('placeholder') ?? '';
    this.textareaEl.name = this.getAttribute('name') ?? '';
    this.textareaEl.rows = parseInt(this.getAttribute('rows') ?? '4', 10) || 4;
    this.textareaEl.disabled = this.hasAttribute('disabled');
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
