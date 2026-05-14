import { UxBase } from './base.js';
import { registerLightStyle, registerStyles } from '../../style-registry.js';

const STYLE_ID = 'ux-card-style';
const STYLE_CSS = `
  ux-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
    width: 100%;
  }
  ux-card {
    display: flex; flex-direction: column;
    background: var(--color-bg, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.75rem; padding: 1.5rem;
    gap: 0.75rem; transition: box-shadow 200ms ease, transform 200ms ease;
  }
  ux-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    transform: translateY(-2px);
  }
  ux-card.hero {
    grid-column: 1 / -1;
    flex-direction: row; align-items: center; gap: 2rem;
    padding: 2rem;
  }
  ux-card.hero ux-card-icon {
    font-size: 3rem; width: 80px; height: 80px;
    display: flex; align-items: center; justify-content: center;
  }
  ux-card h3 { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--color-text, #0f172a); }
  ux-card p { margin: 0; font-size: 0.875rem; color: var(--color-text-muted, #6b7280); }
  ux-card-icon {
    display: flex; align-items: center; justify-content: center;
    width: 48px; height: 48px; border-radius: 0.75rem;
    background: var(--color-bg-muted, #f3f4f6);
    font-size: 1.25rem; font-weight: 700;
    color: var(--color-primary, #6b7280); flex-shrink: 0;
  }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

registerStyles({
  'ux-cards': '',
  'ux-card': '',
  'ux-card-icon': '',
});

export class UxCard extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('click', () => {
      const expanded = !this.hasAttribute('expanded');
      this.toggleAttribute('expanded', expanded);
      this.setAttribute('aria-expanded', String(expanded));
    });
  }
}
