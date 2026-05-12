import { UxBase } from './base.js';
import { escapeAttr, emitReadyOnce } from './helpers.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-input-style';
const STYLE_CSS = `    ux-input {
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
    }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxInput extends UxBase {
  private inputEl: HTMLInputElement | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'type', 'disabled'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.syncAttrs();
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
    emitReadyOnce(this);
  }

  protected applyData(data: any): void {
    if (typeof data === 'string' || typeof data === 'number') {
      this.setAttribute('value', String(data));
    } else if (data && typeof data === 'object') {
      if ('value' in data) this.setAttribute('value', String(data.value ?? ''));
      if ('placeholder' in data) this.setAttribute('placeholder', String(data.placeholder ?? ''));
      if ('name' in data) this.setAttribute('name', String(data.name ?? ''));
      if ('type' in data) this.setAttribute('type', String(data.type ?? 'text'));
      if (data.disabled != null) data.disabled ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
    }
    this.syncAttrs();
  }

  private syncAttrs(): void {
    if (!this.inputEl) return;
    this.inputEl.value = this.getAttribute('value') ?? '';
    this.inputEl.type = this.getAttribute('type') ?? 'text';
    this.inputEl.placeholder = this.getAttribute('placeholder') ?? '';
    this.inputEl.name = this.getAttribute('name') ?? '';
    this.inputEl.disabled = this.hasAttribute('disabled');
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
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true,
      detail: { value },
    }));
  };
}
