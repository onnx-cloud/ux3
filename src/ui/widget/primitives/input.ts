import { UxBase } from './base.js';
import { escapeAttr, emitReadyOnce } from './helpers.js';

export class UxInput extends UxBase {
  private inputEl: HTMLInputElement | null = null;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'type', 'disabled'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
    emitReadyOnce(this);
  }

  protected onAttributeChanged(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === 'value') {
      if (this.inputEl && this.inputEl !== this.shadowRoot?.activeElement) {
        this.inputEl.value = this.getAttribute('value') ?? '';
      }
      return;
    }
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const value = this.getAttribute('value') ?? '';
    const type = this.getAttribute('type') ?? 'text';
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const disabled = this.hasAttribute('disabled') ? 'disabled' : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        input {
          width: 100%;
          box-sizing: border-box;
          padding: var(--ux-input-padding, 0.5rem 0.625rem);
          border: var(--ux-input-border, 1px solid #cbd5e1);
          border-radius: var(--ux-input-radius, 0.375rem);
          background: var(--ux-input-bg, #ffffff);
          color: var(--ux-input-text, #0f172a);
          font: inherit;
        }
        input:focus-visible {
          outline: var(--ux-input-focus-ring, 2px solid #2563eb);
          outline-offset: var(--ux-input-focus-offset, 1px);
        }
      </style>
      <input part="input" type="${type}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" name="${escapeAttr(name)}" ${disabled} />
    `;

    this.inputEl = this.shadowRoot.querySelector('input');
    this.inputEl?.addEventListener('input', this.onInput);
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
