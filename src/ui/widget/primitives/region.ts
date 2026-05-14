import { UxBase } from './base.js';
import { registerLightStyle, registerStyles } from '../../style-registry.js';

const STYLE_ID = 'ux-surface-style';
const STYLE_CSS = `
  ux-surface {
    display: block;
    background: var(--color-surface, #f8fafc);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }
  ux-hero {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 3rem 2rem; text-align: center;
    background: var(--color-bg-muted, #f8fafc);
    border-radius: 1rem; margin-bottom: 2rem;
  }
  ux-hero h2 { font-size: 2rem; margin: 0 0 0.5rem; }
  ux-hero p { font-size: 1.125rem; color: var(--color-text-muted, #6b7280); }
  ux-divider {
    display: block; width: 100%; height: 1px;
    background: var(--color-border, #e2e8f0); margin: 1.5rem 0;
  }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);
registerStyles({
  'ux-surface': '',
  'ux-hero': '',
  'ux-divider': '',
});

export class UxRegion extends UxBase {}
