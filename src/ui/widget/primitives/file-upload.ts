import { UxControl } from './ux-control.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-file-upload-style';
const STYLE_CSS = `
  ux-file-upload {
    display: block;
  }
  ux-file-upload .zone {
    border: 2px dashed var(--ux-upload-border, #d1d5db);
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  ux-file-upload .zone:hover,
  ux-file-upload .zone.drag-over {
    border-color: var(--color-primary, #3b82f6);
    background: var(--color-bg-muted, #f8fafc);
  }
  ux-file-upload .zone.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  ux-file-upload .zone-text {
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
  }
  ux-file-upload input[type="file"] {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  ux-file-upload .files-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
  }
  ux-file-upload .file-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--color-bg-muted, #f8fafc);
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
  ux-file-upload .file-item .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  ux-file-upload .file-item .file-remove {
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--color-danger, #ef4444);
    font-size: 1.125rem;
    padding: 0;
    line-height: 1;
  }
  ux-file-upload progress {
    width: 100%;
    height: 0.5rem;
    border-radius: 0.25rem;
  }
  ux-file-upload progress::-webkit-progress-bar {
    background: var(--color-bg-muted, #f1f5f9);
    border-radius: 0.25rem;
  }
  ux-file-upload progress::-webkit-progress-value {
    background: var(--color-primary, #3b82f6);
    border-radius: 0.25rem;
  }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxFileUpload extends UxControl {
  private zoneEl!: HTMLDivElement;
  private progressEl!: HTMLProgressElement;
  private fileInput!: HTMLInputElement;
  private filesListEl!: HTMLDivElement;
  private selectedFiles: File[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.render();
    this.setupListeners();
    this.syncAttributes();
  }

  private render(): void {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';

    this.zoneEl = document.createElement('div');
    this.zoneEl.className = 'zone empty';
    this.zoneEl.innerHTML = `
      <div class="zone-text">Click or drag files here</div>
    `;

    this.filesListEl = document.createElement('div');
    this.filesListEl.className = 'files-list';

    this.progressEl = document.createElement('progress');
    this.progressEl.value = 0;
    this.progressEl.max = 100;
    this.progressEl.hidden = true;

    this.appendChild(this.fileInput);
    this.appendChild(this.zoneEl);
    this.appendChild(this.filesListEl);
    this.appendChild(this.progressEl);
  }

  private setupListeners(): void {
    this.zoneEl.addEventListener('click', () => this.fileInput.click());
    this.zoneEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.zoneEl.classList.add('drag-over');
    });
    this.zoneEl.addEventListener('dragleave', () => {
      this.zoneEl.classList.remove('drag-over');
    });
    this.zoneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      this.zoneEl.classList.remove('drag-over');
      if (e.dataTransfer?.files.length) {
        this.addFiles(e.dataTransfer.files);
      }
    });
    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files?.length) {
        this.addFiles(this.fileInput.files);
      }
    });
  }

  private syncAttributes(): void {
    ['name', 'required', 'disabled', 'multiple', 'accept'].forEach(attr => {
      const val = this.getAttribute(attr);
      if (val !== null) this.fileInput.setAttribute(attr, val);
    });
  }

  private addFiles(files: FileList): void {
    this.selectedFiles.push(...Array.from(files));
    this.renderFileList();
    this.zoneEl.classList.remove('empty');
    const url = this.getAttribute('action') || '';
    if (url) this.uploadFiles(files, url);
  }

  private renderFileList(): void {
    this.filesListEl.innerHTML = this.selectedFiles.map((f, i) => `
      <div class="file-item">
        <span class="file-name">${this.escape(f.name)}</span>
        <span>${this.formatSize(f.size)}</span>
        <button class="file-remove" data-index="${i}" type="button">&times;</button>
      </div>
    `).join('');
    this.filesListEl.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.selectedFiles.splice(idx, 1);
        this.renderFileList();
        if (!this.selectedFiles.length) this.zoneEl.classList.add('empty');
      });
    });
  }

  private uploadFiles(files: FileList, url: string): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);

    this.emitChange();
    this.dispatchEvent(new CustomEvent('ux:capture.start', {
      bubbles: true, composed: true,
      detail: { action: 'UPLOAD:START', count: files.length },
    }));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    this.progressEl.hidden = false;
    this.progressEl.value = 0;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) this.progressEl.value = Math.round((e.loaded / e.total) * 100);
    });

    xhr.addEventListener('load', () => {
      this.progressEl.value = 100;
      this.dispatchEvent(new CustomEvent('ux:capture.complete', {
        bubbles: true, composed: true,
        detail: { action: 'UPLOAD:COMPLETE', status: xhr.status },
      }));
    });

    xhr.addEventListener('error', () => {
      this.dispatchEvent(new CustomEvent('ux:capture.error', {
        bubbles: true, composed: true,
        detail: { action: 'UPLOAD:ERROR' },
      }));
    });

    xhr.send(formData);
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  static get observedAttributes(): string[] {
    return ['name', 'required', 'disabled', 'multiple', 'accept'];
  }

  protected onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
    super.onAttributeChanged(name, oldVal, newVal);
    if (this.fileInput) {
      if (newVal !== null) this.fileInput.setAttribute(name, newVal);
      else this.fileInput.removeAttribute(name);
    }
  }
}
