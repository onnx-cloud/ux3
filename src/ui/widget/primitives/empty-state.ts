/**
 * UX3 Empty State Component (light DOM)
 */
import { UxBase } from './base.js';

const STYLE_ID = 'ux-empty-state-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    ux-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--ux-empty-padding, 2rem); text-align: center; }
    ux-empty-state .title { font-weight: 600; margin-bottom: 0.25rem; }
    ux-empty-state .desc { color: var(--ux-empty-desc, #6b7280); font-size: 0.875rem; }
  `;
  document.head.appendChild(s);
}

export class UxEmptyState extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    ensureStyles();

    const text = this.textContent?.trim() || 'No data';
    this.innerHTML = `<span style="font-size:2.5rem;opacity:0.4;margin-bottom:0.75rem">\u{1F4AD}</span>
<div class="title">${text}</div>`;
  }
}
