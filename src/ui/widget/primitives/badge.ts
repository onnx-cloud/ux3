/**
 * UX3 Badge Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-badge-style';
const STYLE_CSS = `
  ux-badge { display: inline-flex; align-items: center; padding: 0.125rem 0.625rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; line-height: 1.25rem; }
  ux-badge.default { background: #f3f4f6; color: #374151; }
  ux-badge.primary { background: #dbeafe; color: #1e40af; }
  ux-badge.success { background: #d1fae5; color: #065f46; }
  ux-badge.warning { background: #fef3c7; color: #92400e; }
  ux-badge.error { background: #fee2e2; color: #991b1b; }
  ux-badge.dot { width: 0.5rem; height: 0.5rem; padding: 0; min-width: 0; }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxBadge extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const variant = this.getAttribute('variant') || 'default';
    this.classList.add(variant);
  }
}
