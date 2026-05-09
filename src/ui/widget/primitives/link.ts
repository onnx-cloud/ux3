import { UxBase } from './base.js';

export class UxLink extends UxBase {
  private anchor: HTMLAnchorElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  private render(): void {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '';
    const label = this.textContent?.trim() || href;

    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline; }
        a {
          color: var(--color-link, #3b82f6);
          cursor: pointer;
          text-decoration: none;
        }
        a:hover { text-decoration: underline; }
      </style>
      <a href="${href}"${target ? ` target="${target}" rel="noopener"` : ''}>${label}</a>
    `;

    this.anchor = this.shadowRoot!.querySelector('a');
    this.anchor?.addEventListener('click', this.onAnchorClick);
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

    // External links: let the browser handle normal navigation
    if (href.startsWith('http://') || href.startsWith('https://')) {
      const target = this.getAttribute('target');
      if (target === '_blank') return; // browser handles
      // Same-window external navigation — let browser handle
      return;
    }

    // Internal route navigation — dispatch for the parent view's navigation handler
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('ux:navigate', {
      bubbles: true, composed: true,
      detail: { path: href },
    }));
  };

  private openInModal(modalId: string, href: string): void {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // If the modal has a method to load content, use it
    if (typeof (modal as any).load === 'function') {
      (modal as any).load(href);
    }

    (modal as any).open?.();
    (modal as any).setAttribute('open', '');
  }

  protected onDisconnected(): void {
    this.anchor?.removeEventListener('click', this.onAnchorClick);
    super.onDisconnected();
  }
}
