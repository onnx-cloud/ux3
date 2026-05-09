import { UxBase } from './base.js';
import { escapeAttr } from './helpers.js';

export class UxImage extends UxBase {
  static get observedAttributes(): string[] {
    return ['src', 'alt', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const src = escapeAttr(this.getAttribute('src') ?? '');
    const alt = escapeAttr(this.getAttribute('alt') ?? this.textContent?.trim() ?? '');
    const width = this.getAttribute('width') ? `width="${escapeAttr(this.getAttribute('width')!)}"` : '';
    const height = this.getAttribute('height') ? `height="${escapeAttr(this.getAttribute('height')!)}"` : '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        img { max-width: 100%; height: auto; border-radius: var(--ux-image-radius, 0.375rem); display: block; }
      </style>
      ${src ? `<img src="${src}" alt="${alt}" ${width} ${height} part="img" />` : `<slot></slot>`}
    `;
  }
}

export class UxVideo extends UxBase {
  static get observedAttributes(): string[] {
    return ['src', 'controls', 'muted', 'loop', 'autoplay', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const src = escapeAttr(this.getAttribute('src') ?? '');
    const controls = this.hasAttribute('controls') ? 'controls' : '';
    const muted = this.hasAttribute('muted') ? 'muted' : '';
    const loop = this.hasAttribute('loop') ? 'loop' : '';
    const autoplay = this.hasAttribute('autoplay') ? 'autoplay' : '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        video { max-width: 100%; border-radius: var(--ux-video-radius, 0.375rem); display: block; }
      </style>
      ${src
        ? `<video src="${src}" ${controls} ${muted} ${loop} ${autoplay} part="video"></video>`
        : `<slot></slot>`}
    `;
  }
}

export class UxAudio extends UxBase {
  static get observedAttributes(): string[] {
    return ['src', 'controls', 'loop', 'autoplay'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const src = escapeAttr(this.getAttribute('src') ?? '');
    const controls = this.hasAttribute('controls') ? 'controls' : '';
    const loop = this.hasAttribute('loop') ? 'loop' : '';
    const nodownload = this.hasAttribute('download') ? '' : 'controlsList="nodownload"';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; min-width: var(--ux-audio-min-width, 18rem); }
        audio { width: 100%; }
      </style>
      ${src
        ? `<audio src="${src}" ${controls} ${loop} ${nodownload} part="audio"></audio>`
        : `<slot></slot>`}
    `;
  }
}
