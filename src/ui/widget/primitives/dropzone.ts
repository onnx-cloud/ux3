/**
 * UX3 Drop Zone Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-dropzone-style';
const STYLE_CSS = `    ux-dropzone { display: block; }
    ux-dropzone .zone { border: 2px dashed #d1d5db; border-radius: 0.5rem; padding: 2rem; text-align: center; transition: all 0.2s; }
    ux-dropzone .zone.dragging, ux-dropzone .zone.active { border-color: #3b82f6; background: #eff6ff; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxDropZone extends UxBase {
  protected onConnected(): void {
    super.onConnected();
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
      this.dispatchEvent(new CustomEvent('ux:dropzone.drop', {
        bubbles: true, composed: true,
        detail: { action: 'DROP', files: Array.from((e as DragEvent).dataTransfer?.files || []) },
      }));
    });
  }
}
