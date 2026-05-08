import { UxBase } from './base.js';
import { escapeAttr, escapeText, emitReadyOnce } from './helpers.js';

export class UxTextarea extends UxBase {
  private textareaEl: HTMLTextAreaElement | null = null;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'rows', 'disabled'];
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
      if (this.textareaEl && this.textareaEl !== this.shadowRoot?.activeElement) {
        this.textareaEl.value = this.getAttribute('value') ?? '';
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
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const rows = this.getAttribute('rows') ?? '4';
    const disabled = this.hasAttribute('disabled') ? 'disabled' : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; width: 100%; }
        textarea {
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
        textarea:focus-visible {
          outline: var(--ux-textarea-focus-ring, 2px solid var(--ux-color-accent, #2563eb));
          outline-offset: var(--ux-textarea-focus-offset, 1px);
        }
      </style>
      <textarea part="textarea" rows="${escapeAttr(rows)}" placeholder="${escapeAttr(placeholder)}" name="${escapeAttr(name)}" ${disabled}>${escapeText(value)}</textarea>
    `;

    this.textareaEl = this.shadowRoot.querySelector('textarea');
    this.textareaEl?.addEventListener('input', this.onInput);
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
