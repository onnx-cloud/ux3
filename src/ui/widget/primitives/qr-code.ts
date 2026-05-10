import { UxBase } from './base.js';
import { encodeQR } from '../qr-encode.js';

export class UxQrCode extends UxBase {
  private canvas!: HTMLCanvasElement;

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-block; }
        canvas { display: block; }
      </style>
      <canvas></canvas>
    `;
    this.canvas = this.shadowRoot!.querySelector('canvas')!;

    const text = this.getAttribute('data-text') || this.textContent?.trim() || '';
    if (text) this.generate(text);
  }

  static get observedAttributes(): string[] {
    return ['data-text'];
  }

  protected onAttributeChanged(name: string): void {
    if (name === 'data-text' && this.canvas) {
      const text = this.getAttribute('data-text') || '';
      if (text) this.generate(text);
    }
  }

  private generate(data: string): void {
    const size = parseInt(this.getAttribute('size') || '128', 10);
    const ecLevel = (this.getAttribute('ec') || 'M') as 'L' | 'M' | 'Q' | 'H';

    const matrix = encodeQR(data, ecLevel);
    const modCount = matrix.length;
    const quietZone = 4;

    this.canvas.width = size;
    this.canvas.height = size;
    const ctx = this.canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const modSize = Math.floor(size / (modCount + quietZone * 2));
    const offset = Math.floor((size - modSize * modCount) / 2);

    ctx.fillStyle = '#000000';
    for (let y = 0; y < modCount; y++) {
      for (let x = 0; x < modCount; x++) {
        if (matrix[y][x]) {
          ctx.fillRect(offset + x * modSize, offset + y * modSize, modSize, modSize);
        }
      }
    }
  }
}
