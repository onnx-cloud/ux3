import { UxBase } from './base.js';

export class UxSpinner extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const size = this.getAttribute('size') || '';
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          --_spinner-size: var(--ux-spinner-size, ${size || '1.5rem'});
          --_spinner-border: var(--ux-spinner-border, #e5e7eb);
          --_spinner-accent: var(--ux-spinner-accent, #3b82f6);
          --_spinner-width: var(--ux-spinner-width, 2px);
          display: inline-block;
          width: var(--_spinner-size); height: var(--_spinner-size);
          border: var(--_spinner-width) solid var(--_spinner-border);
          border-top-color: var(--_spinner-accent);
          border-radius: 50%;
          animation: ux-spin 0.6s linear infinite;
        }
        @keyframes ux-spin { to { transform: rotate(360deg); } }
      </style>
      <slot></slot>
    `;
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Loading');
  }
}
