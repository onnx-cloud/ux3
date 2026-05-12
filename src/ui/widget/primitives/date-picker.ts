/**
 * UX3 Date Picker Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-date-picker-style';
const STYLE_CSS = `    ux-date-picker { display: inline-block; }
    ux-date-picker input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font: inherit; }
    ux-date-picker input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxDatePicker extends UxBase {
  protected onConnected(): void {
    super.onConnected();
const input = document.createElement('input');
    input.type = 'date';
    input.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('ux:date.select', {
        bubbles: true, composed: true,
        detail: { action: 'SELECT', value: input.value },
      }));
    });

    this.appendChild(input);
  }
}
