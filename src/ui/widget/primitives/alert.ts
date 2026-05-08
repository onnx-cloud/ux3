import { UxBase } from './base.js';

export class UxAlert extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          --_alert-bg: var(--ux-alert-bg, #eff6ff);
          --_alert-border: var(--ux-alert-border, #bfdbfe);
          --_alert-color: var(--ux-alert-color, #1e3a8a);
          display: block;
        }
        :host([type="success"]) { --_alert-bg: var(--ux-alert-bg-success, #f0fdf4); --_alert-border: var(--ux-alert-border-success, #bbf7d0); --_alert-color: var(--ux-alert-color-success, #065f46); }
        :host([type="warning"]) { --_alert-bg: var(--ux-alert-bg-warning, #fffbeb); --_alert-border: var(--ux-alert-border-warning, #fde68a); --_alert-color: var(--ux-alert-color-warning, #78350f); }
        :host([type="error"])   { --_alert-bg: var(--ux-alert-bg-error, #fef2f2);   --_alert-border: var(--ux-alert-border-error, #fecaca);   --_alert-color: var(--ux-alert-color-error, #7f1d1d); }
        .alert {
          padding: 0.75rem 1rem;
          border-radius: var(--ux-alert-radius, 0.375rem);
          border: 1px solid var(--_alert-border);
          background: var(--_alert-bg);
          color: var(--_alert-color);
          display: flex; align-items: flex-start; gap: 0.75rem;
          overflow-wrap: break-word;
        }
        .message { flex: 1; }
        .dismiss {
          background: none; border: none; cursor: pointer;
          color: inherit; font-size: 1rem; line-height: 1; padding: 0; opacity: 0.5;
        }
        .dismiss:hover { opacity: 1; }
      </style>
      <div class="alert" role="alert">
        <span class="message"><slot></slot></span>
        <slot name="dismiss">
          <button class="dismiss" aria-label="Dismiss">&times;</button>
        </slot>
      </div>
    `;
    this.shadowRoot!.querySelector('.dismiss')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'DISMISS' } }));
      this.remove();
    });
  }
}
