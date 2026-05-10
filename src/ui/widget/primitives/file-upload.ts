/**
 * UX3 File Upload Component (light DOM)
 */
import { UxBase } from './base.js';

const STYLE_ID = 'ux-file-upload-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    ux-file-upload { display: block; }
    ux-file-upload .zone { border: 2px dashed #d1d5db; border-radius: 0.5rem; padding: 2rem; text-align: center; cursor: pointer; transition: border-color 0.2s; }
    ux-file-upload .zone:hover, ux-file-upload .zone.dragging { border-color: #3b82f6; background: #eff6ff; }
    ux-file-upload .label { color: #6b7280; }
    ux-file-upload .file { padding: 0.5rem 0; font-size: 0.875rem; }
    ux-file-upload progress { width: 100%; margin-top: 0.5rem; }
  `;
  document.head.appendChild(s);
}

export class UxFileUpload extends UxBase {
  private filesEl!: HTMLDivElement;

  protected onConnected(): void {
    super.onConnected();
    ensureStyles();

    const zone = document.createElement('div');
    zone.className = 'zone';

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = 'Drop files or click to upload';

    this.filesEl = document.createElement('div');
    this.filesEl.className = 'files';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.style.display = 'none';

    const progress = document.createElement('progress');
    progress.max = 100;
    progress.value = 0;
    progress.hidden = true;

    zone.appendChild(label);
    zone.appendChild(this.filesEl);
    zone.appendChild(fileInput);
    zone.appendChild(progress);

    this.innerHTML = '';
    this.appendChild(zone);

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragging');
      this.handleFiles((e as DragEvent).dataTransfer?.files || null);
    });

    fileInput.addEventListener('change', () => this.handleFiles(fileInput.files));
  }

  private handleFiles(files: FileList | null): void {
    if (!files?.length) return;
    const names = Array.from(files).map(f => f.name);
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action: 'UPLOAD', files, names },
    }));
    this.filesEl.innerHTML = names.map(n => `<div class="file">${n}</div>`).join('');
  }
}
