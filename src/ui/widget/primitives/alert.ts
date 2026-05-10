/**
 * UX3 Alert Component (light DOM)
 */
import { UxBase } from './base.js';

const STYLE_ID = 'ux-alert-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    ux-alert { display: block; }
    ux-alert .alert { padding: 0.75rem 1rem; border-radius: 0.375rem; border: 1px solid var(--ux-alert-border, #bfdbfe); background: var(--ux-alert-bg, #eff6ff); color: var(--ux-alert-color, #1e3a8a); display: flex; align-items: flex-start; gap: 0.75rem; overflow-wrap: break-word; }
    ux-alert[type="success"] .alert { background: var(--ux-alert-bg-success, #f0fdf4); border-color: var(--ux-alert-border-success, #bbf7d0); color: var(--ux-alert-color-success, #065f46); }
    ux-alert[type="warning"] .alert { background: var(--ux-alert-bg-warning, #fffbeb); border-color: var(--ux-alert-border-warning, #fde68a); color: var(--ux-alert-color-warning, #78350f); }
    ux-alert[type="error"]   .alert { background: var(--ux-alert-bg-error, #fef2f2); border-color: var(--ux-alert-border-error, #fecaca); color: var(--ux-alert-color-error, #7f1d1d); }
    ux-alert .message { flex: 1; }
    ux-alert .dismiss { background: none; border: none; cursor: pointer; color: inherit; font-size: 1rem; line-height: 1; padding: 0; opacity: 0.5; }
    ux-alert .dismiss:hover { opacity: 1; }
  `;
  document.head.appendChild(s);
}

export class UxAlert extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    ensureStyles();

    const text = this.textContent?.trim() || '';
    const wrap = document.createElement('div');
    wrap.className = 'alert';
    wrap.setAttribute('role', 'alert');
    wrap.innerHTML = `<span class="message">${text}</span>`;

    const dismiss = document.createElement('button');
    dismiss.className = 'dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.textContent = '\u00D7';
    dismiss.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'DISMISS' } }));
      this.remove();
    });
    wrap.appendChild(dismiss);

    this.innerHTML = '';
    this.appendChild(wrap);
  }
}
