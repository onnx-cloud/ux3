import { UxBase } from './base.js';

export class UxReportBuilder extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        .toolbar { display: flex; gap: 0.5rem; padding: 0.5rem 0; }
        button {
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--ux-rb-border, #d1d5db);
          border-radius: 0.25rem;
          background: var(--ux-rb-bg, #fff);
          cursor: pointer;
          font: inherit; font-size: 0.875rem;
        }
        button:hover { background: var(--ux-rb-hover, #f3f4f6); }
        button.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
        .preview {
          border: 1px solid var(--ux-rb-border, #d1d5db);
          border-radius: 0.375rem;
          padding: 1rem;
          max-height: 300px;
          overflow: auto;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 0.8125rem;
          margin-top: 0.5rem;
        }
      </style>
      <div class="toolbar">
        <button data-action="EXPORT_CSV">Export CSV</button>
        <button data-action="EXPORT_JSON">Export JSON</button>
        <button data-action="COPY">Copy</button>
      </div>
      <div class="preview"></div>
    `;

    const preview = this.shadowRoot!.querySelector('.preview')!;
    this.renderPreview(preview as HTMLElement);

    this.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action')!;

      if (action === 'EXPORT_CSV') this.exportCSV();
      else if (action === 'EXPORT_JSON') this.exportJSON();
      else if (action === 'COPY') this.copyToClipboard();
    });
  }

  private getData(): Record<string, any>[] {
    return Array.from(this.querySelectorAll('[data-row]')).map(el => {
      const row: Record<string, any> = {};
      for (const attr of (el as HTMLElement).attributes) {
        if (attr.name.startsWith('data-') && attr.name !== 'data-row') {
          row[attr.name.slice(5)] = attr.value;
        }
      }
      return row;
    });
  }

  private renderPreview(el: HTMLElement): void {
    const data = this.getData();
    if (!data.length) { el.textContent = 'No data'; return; }
    el.textContent = JSON.stringify(data, null, 2);
  }

  private toCSV(data: Record<string, any>[]): string {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];
    for (const row of data) {
      lines.push(headers.map(h => {
        const v = String(row[h] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(','));
    }
    return lines.join('\n');
  }

  private download(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private exportCSV(): void {
    const csv = this.toCSV(this.getData());
    this.download(csv, 'report.csv', 'text/csv');
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'EXPORT_CSV' } }));
  }

  private exportJSON(): void {
    const json = JSON.stringify(this.getData(), null, 2);
    this.download(json, 'report.json', 'application/json');
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'EXPORT_JSON' } }));
  }

  private copyToClipboard(): void {
    const json = JSON.stringify(this.getData(), null, 2);
    navigator.clipboard?.writeText(json)?.then(() => {
      this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'COPIED' } }));
    });
  }
}
