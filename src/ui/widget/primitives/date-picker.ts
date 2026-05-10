/**
 * UX3 Date Picker Component (light DOM)
 */
import { UxBase } from './base.js';

const STYLE_ID = 'ux-date-picker-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    ux-date-picker { display: inline-block; }
    ux-date-picker input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font: inherit; }
    ux-date-picker input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
  `;
  document.head.appendChild(s);
}

export class UxDatePicker extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    ensureStyles();

    const input = document.createElement('input');
    input.type = 'date';
    input.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('ux:event', {
        bubbles: true, composed: true,
        detail: { action: 'SELECT', value: input.value },
      }));
    });

    this.appendChild(input);
  }
}
