import { UxBase } from './base.js';

export class UxDropZone extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        .zone {
          border: 2px dashed #d1d5db;
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s;
        }
        .zone.dragging, .zone.active { border-color: #3b82f6; background: #eff6ff; }
      </style>
      <div class="zone"><slot>Drop files here</slot></div>
    `;

    const zone = this.shadowRoot!.querySelector('.zone')!;
    let dragCount = 0;

    zone.addEventListener('dragenter', (e) => { e.preventDefault(); dragCount++; zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', () => { dragCount--; if (dragCount <= 0) { dragCount = 0; zone.classList.remove('dragging'); } });
    zone.addEventListener('dragover', (e) => e.preventDefault());
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCount = 0;
      zone.classList.remove('dragging');
      this.dispatchEvent(new CustomEvent('ux:event', {
        bubbles: true, composed: true,
        detail: { action: 'DROP', files: Array.from((e as DragEvent).dataTransfer?.files || []) }
      }));
    });
  }
}
