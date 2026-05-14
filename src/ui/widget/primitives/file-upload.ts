import { UxBase } from './base.js';

export class UxFileUpload extends UxBase {
  private filesEl!: HTMLDivElement;
  private progressEl!: HTMLProgressElement;
  private zoneEl!: HTMLDivElement;
  private fileInput!: HTMLInputElement;
  private selectedFiles: File[] = [];

  static get observedAttributes(): string[] {
    return ['name', 'required', 'disabled', 'multiple', 'accept'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        .zone { border: 2px dashed var(--ux-upload-border, #d1d5db); border-radius: 0.5rem; padding: 2rem; text-align: center; cursor: pointer; transition: border-color 0.2s; }
        .zone:hover, .zone.dragging { border-color: var(--ux-upload-active, #3b82f6); background: var(--ux-upload-bg, #eff6ff); }
        .label { color: var(--ux-upload-label, #6b7280); }
        .files { margin-top: 0.75rem; }
        .file { padding: 0.5rem 0; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
        .file .name { flex: 1; }
        .file .remove { background: none; border: none; cursor: pointer; color: #9ca3af; }
        .file .remove:hover { color: #ef4444; }
        progress { width: 100%; height: 6px; margin-top: 0.75rem; display: block; border-radius: 3px; }
        progress::-webkit-progress-bar { background: #f3f4f6; border-radius: 3px; }
        progress::-webkit-progress-value { background: var(--ux-upload-progress, #3b82f6); border-radius: 3px; }
        :host([disabled]) .zone { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        :host([required]) .label::after { content: " *"; color: #dc2626; }
      </style>
      <div class="zone">
        <div class="label">Drop files or click to upload</div>
        <div class="files"></div>
        <progress max="100" value="0" hidden></progress>
        <input type="file" multiple style="display:none">
      </div>
    `;

    this.zoneEl = this.shadowRoot!.querySelector('.zone')!;
    this.filesEl = this.shadowRoot!.querySelector('.files')!;
    this.progressEl = this.shadowRoot!.querySelector('progress')!;
    this.fileInput = this.shadowRoot!.querySelector('input')!;

    this.zoneEl.addEventListener('click', () => {
      if (!this.hasAttribute('disabled')) this.fileInput.click();
    });
    this.zoneEl.addEventListener('dragover', (e) => { e.preventDefault(); this.zoneEl.classList.add('dragging'); });
    this.zoneEl.addEventListener('dragleave', () => this.zoneEl.classList.remove('dragging'));
    this.zoneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      this.zoneEl.classList.remove('dragging');
      this.handleFiles((e as DragEvent).dataTransfer?.files || null);
    });
    this.fileInput.addEventListener('change', () => this.handleFiles(this.fileInput.files));

    this.syncFileInputAttrs();
  }

  protected onAttributeChanged(name: string): void {
    if (['name', 'required', 'disabled', 'multiple', 'accept'].includes(name)) {
      this.syncFileInputAttrs();
    }
  }

  private syncFileInputAttrs(): void {
    if (!this.fileInput) return;
    const name = this.getAttribute('name');
    if (name) this.fileInput.name = name;
    if (this.hasAttribute('multiple')) this.fileInput.multiple = true;
    const accept = this.getAttribute('accept');
    if (accept) this.fileInput.accept = accept;
    if (this.hasAttribute('required')) this.fileInput.required = true;
    if (this.hasAttribute('disabled')) this.fileInput.disabled = true;
  }

  private handleFiles(files: FileList | null): void {
    if (!files?.length) return;
    this.selectedFiles = Array.from(files);
    const names = this.selectedFiles.map(f => f.name);

    this.filesEl.innerHTML = names.map((n) =>
      `<div class="file"><span class="name">${this.escape(n)}</span><button class="remove" data-name="${this.escape(n)}">&times;</button></div>`
    ).join('');

    this.filesEl.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = (btn as HTMLElement).dataset.name || '';
        this.selectedFiles = this.selectedFiles.filter(f => f.name !== name);
        (btn.closest('.file') as HTMLElement)?.remove();
        const remaining = this.filesEl.querySelectorAll('.file');
        if (remaining.length === 0) this.progressEl.hidden = true;
        this.emitChange();
      });
    });

    const uploadUrl = this.getAttribute('upload-url');
    if (uploadUrl) {
      this.uploadFiles(files, uploadUrl);
    }

    this.emitChange();

    this.dispatchEvent(new CustomEvent('ux:file.upload.start', {
      bubbles: true, composed: true,
      detail: { action: 'UPLOAD', files, names },
    }));
  }

  private emitChange(): void {
    const name = this.getAttribute('name') || '';
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true, composed: true,
      detail: { name, files: this.selectedFiles, value: this.selectedFiles.map(f => f.name).join(', ') },
    }));
  }

  private uploadFiles(files: FileList, url: string): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    this.progressEl.hidden = false;
    this.progressEl.value = 0;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        this.progressEl.value = Math.round((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      this.progressEl.value = 100;
      this.dispatchEvent(new CustomEvent('ux:file.upload.complete', {
        bubbles: true, composed: true,
        detail: { action: 'UPLOAD:COMPLETE', status: xhr.status },
      }));
    });

    xhr.addEventListener('error', () => {
      this.dispatchEvent(new CustomEvent('ux:file.upload.error', {
        bubbles: true, composed: true,
        detail: { action: 'UPLOAD:ERROR' },
      }));
    });

    xhr.send(formData);
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
