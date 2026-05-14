import { UxBase } from './base.js';
import { escapeAttr, emitReadyOnce } from './helpers.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-input-style';
const STYLE_CSS = `
  ux-input {
    display: inline-block; width: 100%;
  }
  ux-input input {
    width: 100%; box-sizing: border-box;
    font: inherit; color: var(--ux-input-text, #0f172a);
    background: var(--ux-input-bg, #ffffff);
    border: 1px solid var(--ux-input-border-color, #cbd5e1);
    border-radius: var(--ux-input-radius, 0.375rem);
    transition: border-color 150ms ease, box-shadow 150ms ease;
    padding: var(--ux-input-padding, 0.5rem 0.625rem);
  }
  ux-input input:focus-visible {
    outline: none;
    border-color: var(--ux-input-focus-border, #2563eb);
    box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
  }
  ux-input input::placeholder { color: var(--ux-input-placeholder, #9ca3af); }
  ux-input input:disabled { opacity: 0.6; cursor: not-allowed; background: var(--ux-input-disabled-bg, #f3f4f6); }

  ux-input[size="xs"] input { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
  ux-input[size="sm"] input { padding: 0.375rem 0.625rem; font-size: 0.875rem; }
  ux-input[size="md"] input, ux-input:not([size]) input { padding: 0.5rem 0.75rem; font-size: 1rem; }
  ux-input[size="lg"] input { padding: 0.625rem 0.875rem; font-size: 1.125rem; }
  ux-input[size="xl"] input { padding: 0.75rem 1rem; font-size: 1.25rem; }

  ux-input[data-variant="compact"] input { padding: 0.375rem 0.625rem; font-size: 0.875rem; }
  ux-input[data-variant="filled"] input {
    background: var(--ux-input-filled-bg, #f3f4f6);
    border-color: transparent;
  }
  ux-input[data-variant="filled"] input:focus-visible {
    background: var(--ux-input-bg, #ffffff);
    border-color: var(--ux-input-focus-border, #2563eb);
  }
  ux-input[variant="filled"] input {
    background: var(--ux-input-filled-bg, #f3f4f6);
    border-color: transparent;
  }
  ux-input[variant="filled"] input:focus-visible {
    background: var(--ux-input-bg, #ffffff);
    border-color: var(--ux-input-focus-border, #2563eb);
  }
  ux-input[variant="underline"] input {
    border-width: 0 0 1px 0;
    border-radius: 0;
    padding-left: 0; padding-right: 0;
  }
  ux-input[variant="underline"] input:focus-visible {
    border-color: var(--ux-input-focus-border, #2563eb);
    box-shadow: none;
  }

  ux-input[invalid] input { border-color: var(--ux-input-error-border, #dc2626); }
  ux-input[invalid] input:focus-visible { border-color: var(--ux-input-error-border, #dc2626); box-shadow: 0 0 0 2px rgba(220,38,38,0.15); }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

const TYPE_DEFAULTS: Record<string, { inputmode?: string; autocapitalize?: string; autocomplete?: string; placeholder?: string }> = {
  email:     { inputmode: 'email',     autocapitalize: 'off',  autocomplete: 'email',       placeholder: 'you@example.com' },
  url:       { inputmode: 'url',       autocapitalize: 'off',  autocomplete: 'url' },
  tel:       { inputmode: 'tel',                               autocomplete: 'tel',          placeholder: '(555) 123-4567' },
  number:    { inputmode: 'numeric',                           autocomplete: 'off' },
  search:    { inputmode: 'search',    autocapitalize: 'off',  autocomplete: 'off' },
  password:  {                           autocapitalize: 'off', autocomplete: 'current-password' },
};

export class UxInput extends UxBase {
  private inputEl: HTMLInputElement | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'type', 'disabled', 'size'];
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
      if ('size' in data) this.setAttribute('size', String(data.size ?? ''));
      if (data.disabled != null) data.disabled ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
    }
    this.syncAttrs();
  }

  private get inputType(): string {
    return this.getAttribute('type') || 'text';
  }

  private syncAttrs(): void {
    if (!this.inputEl) return;
    const type = this.inputType;
    this.inputEl.value = this.getAttribute('value') ?? '';
    this.inputEl.type = type;
    this.inputEl.placeholder = this.getAttribute('placeholder') || TYPE_DEFAULTS[type]?.placeholder || '';
    this.inputEl.name = this.getAttribute('name') ?? '';
    this.inputEl.disabled = this.hasAttribute('disabled');

    const defaults = TYPE_DEFAULTS[type];
    if (defaults?.inputmode) this.inputEl.inputMode = defaults.inputmode as any;
    if (defaults?.autocapitalize) this.inputEl.autocapitalize = defaults.autocapitalize as any;
    if (defaults?.autocomplete) this.inputEl.autocomplete = defaults.autocomplete as any;
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

    const type = this.inputType;
    const value = this.getAttribute('value') ?? '';
    const defaults = TYPE_DEFAULTS[type];
    const placeholder = this.getAttribute('placeholder') || defaults?.placeholder || '';
    const name = this.getAttribute('name') ?? '';
    const disabled = this.hasAttribute('disabled');

    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.placeholder = placeholder;
    input.name = name;
    if (disabled) input.disabled = true;
    if (defaults?.inputmode) input.inputMode = defaults.inputmode as any;
    if (defaults?.autocapitalize) input.autocapitalize = defaults.autocapitalize as any;
    if (defaults?.autocomplete) input.autocomplete = defaults.autocomplete as any;
    input.setAttribute('part', 'input');

    this.appendChild(input);
    this.inputEl = input;

    input.addEventListener('input', (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      this.setAttribute('value', value);
      this.dispatchEvent(new CustomEvent('ux:input.change', {
        bubbles: true, composed: true,
        detail: { name: this.getAttribute('name'), value },
      }));
    });
  }

  private updateAttributes(): void {
    if (!this.inputEl) return;
    const type = this.inputType;
    this.inputEl.type = type;
    this.inputEl.placeholder = this.getAttribute('placeholder') || TYPE_DEFAULTS[type]?.placeholder || '';
    this.inputEl.name = this.getAttribute('name') ?? '';
    this.inputEl.disabled = this.hasAttribute('disabled');

    const defaults = TYPE_DEFAULTS[type];
    if (defaults?.inputmode) this.inputEl.inputMode = defaults.inputmode as any;
    if (defaults?.autocapitalize) this.inputEl.autocapitalize = defaults.autocapitalize as any;
    if (defaults?.autocomplete) this.inputEl.autocomplete = defaults.autocomplete as any;
    if (defaults?.inputmode) this.inputEl.inputMode = defaults.inputmode as any;
    if (defaults?.autocapitalize) this.inputEl.autocapitalize = defaults.autocapitalize as any;
  }
}
