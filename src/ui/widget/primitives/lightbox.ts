import { UxOverlay } from './ux-overlay.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-lightbox-style';
const STYLE_CSS = `
  ux-lightbox {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(0,0,0,0.7);
    display: none;
    align-items: center;
    justify-content: center;
  }
  ux-lightbox[open] {
    display: flex;
  }
  ux-lightbox .lb-container {
    background: var(--color-bg, #fff);
    border-radius: 0.75rem;
    width: min(92vw, 90vw);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  ux-lightbox .lb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
    flex-shrink: 0;
  }
  ux-lightbox .lb-title {
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
  }
  ux-lightbox .lb-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: var(--color-text-muted, #6b7280);
    padding: 0 0.25rem;
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  ux-lightbox .lb-close:hover {
    background: var(--color-bg-muted, #f3f4f6);
    color: var(--color-text, #0f172a);
  }
  ux-lightbox .lb-body {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  ux-lightbox .lb-image {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 0.5rem;
  }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxLightbox extends UxOverlay {
  private containerEl: HTMLDivElement | null = null;
  private imageEl: HTMLImageElement | null = null;
  private titleEl: HTMLSpanElement | null = null;

  private render(): void {
    const container = document.createElement('div');
    container.className = 'lb-container';

    const header = document.createElement('div');
    header.className = 'lb-header';

    this.titleEl = document.createElement('span');
    this.titleEl.className = 'lb-title';
    header.appendChild(this.titleEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lb-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'lb-body';

    this.imageEl = document.createElement('img');
    this.imageEl.className = 'lb-image';
    body.appendChild(this.imageEl);
    container.appendChild(body);

    this.containerEl = container;
    this.appendChild(container);
  }

  openImage(src: string, alt?: string): void {
    if (this.imageEl) {
      this.imageEl.src = src;
      this.imageEl.alt = alt || '';
    }
    if (this.titleEl) {
      this.titleEl.textContent = alt || 'Image';
    }
    this.show();
  }

  protected onConnected(): void {
    super.onConnected();
    this.render();
    // click background to close
    this.addEventListener('click', (e) => {
      if (e.target === this) this.hide();
    });
  }

  protected addBackdrop(): void {
    // lightbox is its own backdrop — skip parent backdrop
  }

  protected removeBackdrop(): void {
    // no-op
  }
}

// Auto-init click-to-open behavior on images and image panels
let _lightboxInited = false;
function initImageLightbox(): void {
  if (typeof document === 'undefined' || _lightboxInited) return;
  _lightboxInited = true;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('ux-lightbox')) return;

    const panel = target.closest('ux-image-panel, ux-image') as HTMLElement | null;
    if (!panel) return;
    const img = panel.querySelector('img') as HTMLImageElement | null;
    if (!img?.src) return;

    let lightbox = document.querySelector('ux-lightbox') as UxLightbox | null;
    if (!lightbox) {
      lightbox = document.createElement('ux-lightbox') as UxLightbox;
      document.body.appendChild(lightbox);
    }
    lightbox.openImage(img.src, img.alt);
  });
}

initImageLightbox();
