import { UxBase } from './base.js';

export class UxFileUpload extends UxBase {
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
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .zone:hover, .zone.dragging { border-color: #3b82f6; background: #eff6ff; }
        input[type="file"] { display: none; }
        .label { color: #6b7280; }
        .file { padding: 0.5rem 0; font-size: 0.875rem; }
        progress { width: 100%; margin-top: 0.5rem; }
      </style>
      <div class="zone">
        <div class="label">Drop files or click to upload</div>
        <div class="files"></div>
        <input type="file" multiple>
        <progress max="100" value="0" hidden></progress>
      </div>
    `;

    const zone = this.shadowRoot!.querySelector('.zone')!;
    const fileInput = this.shadowRoot!.querySelector('input')! as HTMLInputElement;
    const progress = this.shadowRoot!.querySelector('progress')!;

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragging');
      this.handleFiles((e as DragEvent).dataTransfer?.files || null);
    });

    fileInput.addEventListener('change', () => this.handleFiles(fileInput.files));

    const slotFiles = this.querySelectorAll('[slot="file"]');
    if (slotFiles.length) {
      this.shadowRoot!.querySelector('.files')!.innerHTML =
        Array.from(slotFiles).map(f => `<div class="file">${f.textContent}</div>`).join('');
    }
  }

  private handleFiles(files: FileList | null): void {
    if (!files?.length) return;
    const names = Array.from(files).map(f => f.name);
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action: 'UPLOAD', files, names }
    }));
    this.shadowRoot!.querySelector('.files')!.innerHTML =
      names.map(n => `<div class="file">${n}</div>`).join('');
  }
}
