/**
 * UX3 Media Components — light DOM (ux-image, ux-video, ux-audio)
 */
import { UxBase } from './base.js';

const STYLE_ID = 'ux-media-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    ux-image { display: inline-block; }
    ux-image img { max-width: 100%; height: auto; border-radius: var(--ux-image-radius, 0.375rem); display: block; }
    ux-video { display: block; }
    ux-video video { max-width: 100%; border-radius: var(--ux-video-radius, 0.375rem); display: block; }
    ux-audio { display: block; min-width: var(--ux-audio-min-width, 18rem); }
    ux-audio audio { width: 100%; }
  `;
  document.head.appendChild(s);
}

function attrVal(el: Element, name: string, fallback: string = ''): string {
  const v = el.getAttribute(name);
  return v !== null ? v : fallback;
}

export class UxImage extends UxBase {
  static get observedAttributes(): string[] {
    return ['src', 'alt', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    ensureStyles();
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    const src = attrVal(this, 'src');
    const alt = attrVal(this, 'alt', this.textContent?.trim() || '');
    const w = attrVal(this, 'width');
    const h = attrVal(this, 'height');

    if (src) {
      this.innerHTML = `<img src="${src}" alt="${alt}"${w ? ` width="${w}"` : ''}${h ? ` height="${h}"` : ''} part="img" />`;
    }
  }
}

export class UxVideo extends UxBase {
  static get observedAttributes(): string[] {
    return ['src', 'controls', 'muted', 'loop', 'autoplay', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    ensureStyles();
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    const src = attrVal(this, 'src');
    const controls = this.hasAttribute('controls') ? ' controls' : '';
    const muted = this.hasAttribute('muted') ? ' muted' : '';
    const loop = this.hasAttribute('loop') ? ' loop' : '';
    const autoplay = this.hasAttribute('autoplay') ? ' autoplay' : '';

    if (src) {
      this.innerHTML = `<video src="${src}"${controls}${muted}${loop}${autoplay} part="video"></video>`;
    }
  }
}

export class UxAudio extends UxBase {
  static get observedAttributes(): string[] {
    return ['src', 'controls', 'loop', 'autoplay'];
  }

  protected onConnected(): void {
    super.onConnected();
    ensureStyles();
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    const src = attrVal(this, 'src');
    const controls = this.hasAttribute('controls') ? ' controls' : '';
    const loop = this.hasAttribute('loop') ? ' loop' : '';
    const nodownload = this.hasAttribute('download') ? '' : ' controlsList="nodownload"';

    if (src) {
      this.innerHTML = `<audio src="${src}"${controls}${loop}${nodownload} part="audio"></audio>`;
    }
  }
}
