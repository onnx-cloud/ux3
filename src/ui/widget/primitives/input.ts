import { UxBase } from './base.js';
import { escapeAttr, emitReadyOnce } from './helpers.js';

const STYLE_ID = 'ux-input-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ux-input {
      display: inline-block;
    }
    ux-input input {
      width: 100%;
      box-sizing: border-box;
      padding: var(--ux-input-padding, 0.5rem 0.625rem);
      border: var(--ux-input-border, 1px solid #cbd5e1);
      border-radius: var(--ux-input-radius, 0.375rem);
      background: var(--ux-input-bg, #ffffff);
      color: var(--ux-input-text, #0f172a);
      font: inherit;
    }
    ux-input input:focus-visible {
      outline: var(--ux-input-focus-ring, 2px solid #2563eb);
      outline-offset: var(--ux-input-focus-offset, 1px);
    }
  `;
  document.head.appendChild(style);
}

export class UxInput extends UxBase {
  private inputEl: HTMLInputElement | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'type', 'disabled'];
  }

  protected onConnected(): void {
    super.onConnected();
    ensureStyles();
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
    emitReadyOnce(this);
  }

  protected onAttributeChanged(name: string): void {
    if (!this.isConnected) return;
    if (name === 'value') {
      if (this.inputEl && this.inputEl !== document.activeElement) {
        this.inputEl.value = this.getAttribute('value') ?? '';
      }
      return;
    }
    this.render();
  }

  private render(): void {
    if (this.inputEl) {
      this.updateAttributes();
      return;
    }

    const value = this.getAttribute('value') ?? '';
    const type = this.getAttribute('type') ?? 'text';
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const disabled = this.hasAttribute('disabled') ? 'disabled' : '';

    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.placeholder = placeholder;
    input.name = name;
    if (disabled) input.disabled = true;
    input.setAttribute('part', 'input');

    this.appendChild(input);
    this.inputEl = input;

    input.addEventListener('input', this.onInput);
  }

  private updateAttributes(): void {
    if (!this.inputEl) return;
    const type = this.getAttribute('type') ?? 'text';
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const disabled = this.hasAttribute('disabled');
    this.inputEl.type = type;
    this.inputEl.placeholder = placeholder;
    this.inputEl.name = name;
    this.inputEl.disabled = disabled;
  }

  private readonly onInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { value },
    }));
  };
}
