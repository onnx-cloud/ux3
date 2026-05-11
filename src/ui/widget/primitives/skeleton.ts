/**
 * UX3 Skeleton Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-skeleton-style';
const STYLE_CSS = `
  ux-skeleton { display: block; background: #e5e7eb; border-radius: 0.25rem; animation: ux-pulse 1.5s ease-in-out infinite; }
  ux-skeleton[variant="rect"], ux-skeleton:not([variant]) { width: 100%; height: 1rem; }
  ux-skeleton[variant="circle"] { width: 3rem; height: 3rem; border-radius: 50%; }
  ux-skeleton[variant="text"] { width: 100%; height: 0.75rem; }
  ux-skeleton[variant="heading"] { width: 60%; height: 1.5rem; }
  @keyframes ux-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxSkeleton extends UxBase {
  protected onConnected(): void {
    super.onConnected();
  }
}
