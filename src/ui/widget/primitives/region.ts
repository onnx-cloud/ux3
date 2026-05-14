import { UxBase } from './base.js';
import { registerLightStyle, registerStyles } from '../../style-registry.js';

const STYLE_ID = 'ux-surface-style';
const STYLE_CSS = `
  ux-region { display: block; }
  ux-region[type="surface"],
  ux-surface {
    display: block;
    background: var(--ux-surface-secondary, #f8fafc);
    border: 1px solid var(--ux-border-light, #e2e8f0);
    border-radius: var(--ux-radius-xl, 0.75rem);
    padding: var(--ux-space-6, 1.5rem);
  }
  ux-region[type="hero"],
  ux-hero {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: var(--ux-space-8, 2rem) var(--ux-space-6, 1.5rem); text-align: center;
    background: var(--ux-surface-secondary, #f8fafc);
    border-radius: var(--ux-radius-xl, 0.75rem); margin-bottom: var(--ux-space-8, 2rem);
  }
  ux-hero h2 { font-size: 2rem; margin: 0 0 0.5rem; }
  ux-hero p { font-size: 1.125rem; color: var(--ux-text-muted, #6b7280); }

  ux-region[type="divider"],
  ux-divider {
    display: block; width: 100%; height: 1px;
    background: var(--ux-border-light, #e2e8f0); margin: var(--ux-space-6, 1.5rem) 0;
  }
  ux-region[type="stack"] { display: flex; flex-direction: column; gap: var(--ux-space-4, 1rem); }
  ux-region[type="inline"] { display: flex; align-items: center; gap: var(--ux-space-2, 0.5rem); }
  ux-region[type="grid"] { display: grid; gap: var(--ux-space-4, 1rem); }
  ux-region[type="app-shell"] { display: flex; flex-direction: column; min-height: 100vh; }
  ux-region[type="topbar"] { display: flex; align-items: center; gap: var(--ux-space-4, 1rem); padding: var(--ux-space-2, 0.5rem) var(--ux-space-4, 1rem); }
  ux-region[type="sidebar"] { display: flex; flex-direction: column; flex-shrink: 0; }
  ux-region[type="content"] { flex: 1; overflow: auto; }
  ux-region[type="article"] { max-width: 65ch; line-height: var(--ux-leading-normal, 1.6); }
  ux-region[type="list"] { display: flex; flex-direction: column; gap: var(--ux-space-2, 0.5rem); }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);
registerStyles({
  'ux-surface': '',
  'ux-hero': '',
  'ux-divider': '',
});

export class UxRegion extends UxBase {}
