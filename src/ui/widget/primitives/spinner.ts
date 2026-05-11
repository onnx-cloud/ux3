/**
 * UX3 Spinner Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-spinner-style';
const STYLE_CSS = `
  ux-spinner {
    display: inline-block;
    width: var(--ux-spinner-size, 1.5rem);
    height: var(--ux-spinner-size, 1.5rem);
    border: var(--ux-spinner-width, 2px) solid var(--ux-spinner-border, #e5e7eb);
    border-top-color: var(--ux-spinner-accent, #3b82f6);
    border-radius: 50%;
    animation: ux-spin 0.6s linear infinite;
  }
  @keyframes ux-spin { to { transform: rotate(360deg); } }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxSpinner extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Loading');
  }
}
