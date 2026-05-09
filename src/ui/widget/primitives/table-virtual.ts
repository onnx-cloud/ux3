import { UxBase } from './base.js';

export class UxTableVirtual extends UxBase {
  private observer: IntersectionObserver | null = null;
  private viewport!: HTMLDivElement;
  private rowHeight = 36;
  private overscan = 5;
  private totalRows = 0;
  private columns: string[] = [];
  private data: Record<string, string>[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.columns = (this.getAttribute('columns') || '').split(',').map(c => c.trim()).filter(Boolean);
    this.rowHeight = parseInt(this.getAttribute('row-height') || '36', 10);
    this.totalRows = parseInt(this.getAttribute('total') || '0', 10);

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; overflow: auto; height: 400px; }
        .table { width: 100%; table-layout: fixed; border-collapse: collapse; }
        thead { position: sticky; top: 0; z-index: 1; }
        th {
          padding: 0.5rem; text-align: left; font-weight: 600; font-size: 0.75rem;
          background: var(--ux-vt-header, #f9fafb);
          border-bottom: 2px solid var(--ux-vt-border, #e5e7eb);
        }
        .body-wrap { position: relative; }
        td {
          padding: 0.5rem; border-bottom: 1px solid var(--ux-vt-border, #e5e7eb);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          height: ${this.rowHeight}px; box-sizing: border-box;
        }
        .sensor-top, .sensor-bottom { height: 1px; }
      </style>
      <table class="table">
        <thead><tr>${this.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody class="body-wrap">
          <tr class="sensor-top"><td colspan="${this.columns.length || 1}"></td></tr>
          <tr class="sensor-bottom"><td colspan="${this.columns.length || 1}"></td></tr>
        </tbody>
      </table>
    `;

    this.viewport = this.shadowRoot!.querySelector('.body-wrap')!;

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.renderVisibleRows();
        }
      }
    }, { root: this, rootMargin: `${this.overscan * this.rowHeight}px` });

    const topSensor = this.shadowRoot!.querySelector('.sensor-top')!;
    const bottomSensor = this.shadowRoot!.querySelector('.sensor-bottom')!;
    this.observer.observe(topSensor);
    this.observer.observe(bottomSensor);

    this.renderVisibleRows();
  }

  private renderVisibleRows(): void {
    const containerHeight = this.clientHeight;
    const scrollTop = this.scrollTop;
    const startIdx = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.overscan);
    const visibleCount = Math.ceil(containerHeight / this.rowHeight) + this.overscan * 2;
    const endIdx = Math.min(this.totalRows, startIdx + visibleCount);

    const tbody = this.shadowRoot!.querySelector('.body-wrap')!;
    const topSensor = tbody.querySelector('.sensor-top')!;
    const bottomSensor = tbody.querySelector('.sensor-bottom')!;

    // Remove old rows, keep sensors
    while (tbody.firstChild && tbody.firstChild !== topSensor) {
      tbody.removeChild(tbody.firstChild);
    }
    while (tbody.lastChild && tbody.lastChild !== bottomSensor) {
      tbody.removeChild(tbody.lastChild);
    }

    (topSensor as HTMLElement).style.height = `${startIdx * this.rowHeight}px`;
    (bottomSensor as HTMLElement).style.height = `${(this.totalRows - endIdx) * this.rowHeight}px`;

    // Render visible rows from slot data
    const rows = Array.from(this.querySelectorAll('[data-row]'));
    const visibleRows = rows.slice(startIdx, endIdx);
    const targetEl = bottomSensor as HTMLElement;

    for (const row of visibleRows) {
      const tr = document.createElement('tr');
      tr.innerHTML = (row as HTMLElement).innerHTML || this.columns.map(() => '<td></td>').join('');
      tr.querySelectorAll('td').forEach(td => td.style.height = `${this.rowHeight}px`);
      targetEl.before(tr);
    }
  }

  protected onDisconnected(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    super.onDisconnected();
  }
}
