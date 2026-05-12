import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-link-style';
const STYLE_CSS = `    ux-link { display: inline; }
    ux-link a { color: var(--color-link, #3b82f6); cursor: pointer; text-decoration: none; }
    ux-link a:hover { text-decoration: underline; }
    .ux-link-modal { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
    .ux-link-modal > div { background: var(--color-bg, #fff); border-radius: 8px; width: 90vw; height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
    .ux-link-modal header { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border-bottom: 1px solid var(--color-border, #e2e8f0); flex-shrink: 0; }
    .ux-link-modal header span { font-size: 0.875rem; color: var(--color-text-secondary, #475569); max-width: 80%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ux-link-modal header button { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-secondary, #475569); padding: 0 0.25rem; }
    .ux-link-modal header button:hover { color: var(--color-text, #0f172a); }
    .ux-link-modal iframe { flex: 1; border: none; width: 100%; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxLink extends UxBase {
  private anchor: HTMLAnchorElement | null = null;

  protected onConnected(): void {
    super.onConnected();
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

    const target = this.getAttribute('target');

    if (target === 'modal') {
      e.preventDefault();
      this.createModalFrame(href);
      return;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      if (target === '_blank') return;
      return;
    }

    e.preventDefault();
    this.dispatchEvent(new CustomEvent('ux:route.navigate', {
      bubbles: true, composed: true,
      detail: { path: href },
    }));
  };

  private createModalFrame(href: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'ux-link-modal';

    const inner = document.createElement('div');
    const header = document.createElement('header');
    const urlSpan = document.createElement('span');
    urlSpan.textContent = href;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', 'Close');
    const externalBtn = document.createElement('button');
    externalBtn.textContent = '\u2197';
    externalBtn.setAttribute('aria-label', 'Open in new tab');

    header.appendChild(urlSpan);
    header.appendChild(externalBtn);
    header.appendChild(closeBtn);
    inner.appendChild(header);

    const iframe = document.createElement('iframe');
    iframe.src = href;
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
    inner.appendChild(iframe);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        overlay.remove();
        clearTimeout(timeout);
      }
    };

    const openFallback = () => {
      if (resolved) return;
      resolved = true;
      overlay.remove();
      clearTimeout(timeout);
      window.open(href, '_blank', 'noopener');
    };

    closeBtn.addEventListener('click', cleanup);
    externalBtn.addEventListener('click', openFallback);
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) cleanup();
    });

    const timeout = setTimeout(() => openFallback(), 8000);

    iframe.addEventListener('load', () => {
      if (resolved) return;
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.body && doc.body.innerText.trim() === '') {
          setTimeout(() => openFallback(), 500);
        }
      } catch {
        // cross-origin, assume loaded
      }
    });
  }

  protected onDisconnected(): void {
    this.anchor?.removeEventListener('click', this.onAnchorClick);
    super.onDisconnected();
  }
}
