/**
 * UX3 Media Components — light DOM (ux-image, ux-video, ux-audio)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-media-style';
const STYLE_CSS = `    ux-image { display: inline-block; }
    ux-image img { max-width: 100%; height: auto; border-radius: var(--ux-image-radius, 0.375rem); display: block; }
    ux-video { display: block; }
    ux-video video { max-width: 100%; border-radius: var(--ux-video-radius, 0.375rem); display: block; }
    ux-audio { display: block; min-width: var(--ux-audio-min-width, 18rem); }
    ux-audio audio { width: 100%; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
function attrVal(el: Element, name: string, fallback: string = ''): string {
  const v = el.getAttribute(name);
  return v !== null ? v : fallback;
}

export class UxImage extends UxBase {
  private _mediaRenderScheduled = false;

  static get observedAttributes(): string[] {
    return ['src', 'alt', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.scheduleRender();
  }

  protected applyData(data: any): void {
    if (typeof data === 'string') this.setAttribute('src', data);
    else if (data && typeof data === 'object') {
      if ('src' in data) this.setAttribute('src', String(data.src));
      if ('alt' in data) this.setAttribute('alt', String(data.alt));
      if ('width' in data) this.setAttribute('width', String(data.width));
      if ('height' in data) this.setAttribute('height', String(data.height));
    }
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this._mediaRenderScheduled) return;
    this._mediaRenderScheduled = true;
    queueMicrotask(() => {
      this._mediaRenderScheduled = false;
      this.render();
    });
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
  private _mediaRenderScheduled = false;

  static get observedAttributes(): string[] {
    return ['src', 'controls', 'muted', 'loop', 'autoplay', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.scheduleRender();
  }

  protected applyData(data: any): void {
    if (typeof data === 'string') this.setAttribute('src', data);
    else if (data && typeof data === 'object') {
      if ('src' in data) this.setAttribute('src', String(data.src));
      if ('controls' in data) data.controls ? this.setAttribute('controls', '') : this.removeAttribute('controls');
      if ('muted' in data) data.muted ? this.setAttribute('muted', '') : this.removeAttribute('muted');
      if ('loop' in data) data.loop ? this.setAttribute('loop', '') : this.removeAttribute('loop');
      if ('autoplay' in data) data.autoplay ? this.setAttribute('autoplay', '') : this.removeAttribute('autoplay');
    }
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this._mediaRenderScheduled) return;
    this._mediaRenderScheduled = true;
    queueMicrotask(() => {
      this._mediaRenderScheduled = false;
      this.render();
    });
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
  private _mediaRenderScheduled = false;

  static get observedAttributes(): string[] {
    return ['src', 'controls', 'loop', 'autoplay'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.scheduleRender();
  }

  protected applyData(data: any): void {
    if (typeof data === 'string') this.setAttribute('src', data);
    else if (data && typeof data === 'object') {
      if ('src' in data) this.setAttribute('src', String(data.src));
      if ('controls' in data) data.controls ? this.setAttribute('controls', '') : this.removeAttribute('controls');
      if ('loop' in data) data.loop ? this.setAttribute('loop', '') : this.removeAttribute('loop');
      if ('autoplay' in data) data.autoplay ? this.setAttribute('autoplay', '') : this.removeAttribute('autoplay');
      if ('download' in data) data.download ? this.setAttribute('download', '') : this.removeAttribute('download');
    }
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this._mediaRenderScheduled) return;
    this._mediaRenderScheduled = true;
    queueMicrotask(() => {
      this._mediaRenderScheduled = false;
      this.render();
    });
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
