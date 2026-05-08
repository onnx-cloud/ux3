import { UxBase } from './base.js';

export class UxDatePicker extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-block; }
        input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font: inherit;
        }
        input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
      </style>
      <input type="date">
    `;

    const input = this.shadowRoot!.querySelector('input')!;
    input.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('ux:event', {
        bubbles: true, composed: true,
        detail: { action: 'SELECT', value: input.value }
      }));
    });
  }
}
