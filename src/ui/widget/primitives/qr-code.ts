import { UxBase } from './base.js';

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

    this.addEventListener('ux:event', ((e: CustomEvent) => {
      if (e.detail?.action === 'GENERATE') {
        this.generate(e.detail.data || '');
      }
    }) as EventListener);
  }

  private generate(data: string): void {
    const size = parseInt(this.getAttribute('size') || '128', 10);
    this.canvas.width = size;
    this.canvas.height = size;

    const ctx = this.canvas.getContext('2d')!;
    const modSize = Math.floor(size / 21);
    const offset = Math.floor((size - modSize * 21) / 2);

    const qr = this.simpleQR(data);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        if (Number((qr >> BigInt(y * 21 + x)) & 1n)) {
          ctx.fillRect(offset + x * modSize, offset + y * modSize, modSize, modSize);
        }
      }
    }

    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action: 'READY' }
    }));
  }

  private simpleQR(data: string): bigint {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
    }
    // Generate a deterministic 21x21 pattern from data hash
    let qr = 0n;
    for (let i = 0; i < 441; i++) {
      hash = ((hash << 5) - hash + i) | 0;
      if ((Math.abs(hash) % 3) === 0) {
        qr |= 1n << BigInt(i);
      }
    }
    // Add finder patterns (3 corners)
    for (let c = 0; c < 3; c++) {
      const bx = c === 0 ? 0 : c === 1 ? 14 : 0;
      const by = c === 0 ? 0 : c === 1 ? 0 : 14;
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const edge = x === 0 || x === 6 || y === 0 || y === 6;
          const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          if (edge || inner) {
            qr |= 1n << BigInt((by + y) * 21 + (bx + x));
          }
        }
      }
    }
    return qr;
  }
}
