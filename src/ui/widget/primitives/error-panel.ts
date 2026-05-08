import { UxBase } from './base.js';

export class UxErrorPanel extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          --_err-bg: var(--ux-error-bg, #fef2f2);
          --_err-border: var(--ux-error-border, #fecaca);
          --_err-color: var(--ux-error-color, #7f1d1d);
          display: block;
        }
        .panel {
          padding: var(--ux-error-padding, 1rem);
          background: var(--_err-bg);
          border: 1px solid var(--_err-border);
          border-radius: var(--ux-error-radius, 0.375rem);
          color: var(--_err-color);
        }
        .message { margin-bottom: 0.5rem; }
        .actions { display: flex; gap: 0.5rem; }
        ::slotted(button) {
          padding: 0.25rem 0.75rem; border-radius: 0.25rem; cursor: pointer;
          background: var(--ux-retry-bg, #fee2e2); border: 1px solid var(--_err-border); color: inherit;
        }
      </style>
      <div class="panel" role="alert">
        <div class="message"><slot name="message">An error occurred</slot></div>
        <div class="actions"><slot name="actions"></slot></div>
      </div>
    `;
    this.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (btn) {
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: btn.getAttribute('data-action') }
        }));
      }
    });
  }
}
