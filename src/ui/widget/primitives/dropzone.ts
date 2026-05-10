/**
 * UX3 Drop Zone Component (light DOM)
 */
import { UxBase } from './base.js';

const STYLE_ID = 'ux-dropzone-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    ux-dropzone { display: block; }
    ux-dropzone .zone { border: 2px dashed #d1d5db; border-radius: 0.5rem; padding: 2rem; text-align: center; transition: all 0.2s; }
    ux-dropzone .zone.dragging, ux-dropzone .zone.active { border-color: #3b82f6; background: #eff6ff; }
  `;
  document.head.appendChild(s);
}

export class UxDropZone extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    ensureStyles();

    const text = this.textContent?.trim() || 'Drop files here';

    const zone = document.createElement('div');
    zone.className = 'zone';
    zone.textContent = text;
    this.innerHTML = '';
    this.appendChild(zone);

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
        detail: { action: 'DROP', files: Array.from((e as DragEvent).dataTransfer?.files || []) },
      }));
    });
  }
}
