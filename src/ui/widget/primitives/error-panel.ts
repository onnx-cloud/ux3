/**
 * UX3 Error Panel Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-error-panel-style';
const STYLE_CSS = `    ux-error-panel { display: block; }
    ux-error-panel .panel { padding: var(--ux-error-padding, 1rem); background: var(--ux-error-bg, #fef2f2); border: 1px solid var(--ux-error-border, #fecaca); border-radius: var(--ux-error-radius, 0.375rem); color: var(--ux-error-color, #7f1d1d); }
    ux-error-panel .message { margin-bottom: 0.5rem; }
    ux-error-panel .actions { display: flex; gap: 0.5rem; }
    ux-error-panel button[data-action] { padding: 0.25rem 0.75rem; border-radius: 0.25rem; cursor: pointer; background: var(--ux-retry-bg, #fee2e2); border: 1px solid var(--ux-error-border, #fecaca); color: inherit; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxErrorPanel extends UxBase {
  protected onConnected(): void {
    super.onConnected();
const text = this.textContent?.trim() || 'An error occurred';
    const wrap = document.createElement('div');
    wrap.className = 'panel';
    wrap.setAttribute('role', 'alert');
    wrap.innerHTML = `<div class="message">${text}</div>`;

    const actionsEl = document.createElement('div');
    actionsEl.className = 'actions';
    wrap.appendChild(actionsEl);

    this.innerHTML = '';
    this.appendChild(wrap);

    this.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (btn) {
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: btn.getAttribute('data-action') },
        }));
      }
    });
  }
}
