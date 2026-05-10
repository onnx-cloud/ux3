/**
 * UX3 Link Component (light DOM)
 */
import { UxBase } from './base.js';

const STYLE_ID = 'ux-link-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    ux-link { display: inline; }
    ux-link a { color: var(--color-link, #3b82f6); cursor: pointer; text-decoration: none; }
    ux-link a:hover { text-decoration: underline; }
  `;
  document.head.appendChild(s);
}

export class UxLink extends UxBase {
  private anchor: HTMLAnchorElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    ensureStyles();
    this.render();
  }

  private render(): void {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '';
    const label = this.textContent?.trim() || href;

    this.innerHTML = '';
    const a = document.createElement('a');
    a.href = href;
    if (target) { a.target = target; a.rel = 'noopener'; }
    a.textContent = label;
    this.appendChild(a);
    this.anchor = a;
    this.anchor.addEventListener('click', this.onAnchorClick);
  }

  private readonly onAnchorClick = (e: Event) => {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;

    const modalId = this.getAttribute('modal');
    if (modalId) {
      e.preventDefault();
      this.openInModal(modalId, href);
      return;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      if (this.getAttribute('target') === '_blank') return;
      return;
    }

    e.preventDefault();
    this.dispatchEvent(new CustomEvent('ux:navigate', {
      bubbles: true, composed: true,
      detail: { path: href },
    }));
  };

  private openInModal(modalId: string, href: string): void {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (typeof (modal as any).load === 'function') {
      (modal as any).load(href);
    }
    (modal as any).open?.();
    (modal as any).setAttribute?.('open', '');
  }

  protected onDisconnected(): void {
    this.anchor?.removeEventListener('click', this.onAnchorClick);
    super.onDisconnected();
  }
}
