import { UxBase } from './base.js';

export class UxSkeleton extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const variant = this.getAttribute('variant') || 'rect';
    const dims: Record<string, string> = {
      rect: 'width: 100%; height: 1rem;',
      circle: 'width: 3rem; height: 3rem; border-radius: 50%;',
      text: 'width: 100%; height: 0.75rem;',
      heading: 'width: 60%; height: 1.5rem;',
    };
    const s = dims[variant] || dims.rect;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; background: #e5e7eb; border-radius: 0.25rem; animation: pulse 1.5s ease-in-out infinite; ${s} }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      </style>
    `;
  }
}
