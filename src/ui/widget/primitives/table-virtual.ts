import { UxBase } from './base.js';

export class UxTableVirtual extends UxBase {
  private observer: IntersectionObserver | null = null;
  private rowHeight = 36;
  private overscan = 5;
  private totalRows = 0;
  private columns: string[] = [];
  private rows: Record<string, string>[] = [];
  private scrollRaf = 0;

  protected onConnected(): void {
    super.onConnected();
    this.columns = (this.getAttribute('columns') || '').split(',').map(c => c.trim()).filter(Boolean);
    this.rowHeight = parseInt(this.getAttribute('row-height') || '36', 10);

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
          cursor: pointer; user-select: none;
        }
        th:hover { background: var(--ux-vt-header-hover, #f3f4f6); }
        th.sorted-asc::after { content: ' ▲'; }
        th.sorted-desc::after { content: ' ▼'; }
        .body-wrap { position: relative; }
        td {
          padding: 0.5rem; border-bottom: 1px solid var(--ux-vt-border, #e5e7eb);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          height: ${this.rowHeight}px; box-sizing: border-box;
        }
        .sensor-top, .sensor-bottom { height: 1px; }
      </style>
      <table class="table">
        <thead><tr>${this.columns.map((c, i) => `<th data-col="${i}">${c}</th>`).join('')}</tr></thead>
        <tbody class="body-wrap">
          <tr class="sensor-top"><td colspan="${this.columns.length || 1}"></td></tr>
          <tr class="sensor-bottom"><td colspan="${this.columns.length || 1}"></td></tr>
        </tbody>
      </table>
    `;

    // Sort on header click
    this.shadowRoot!.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const col = parseInt((th as HTMLElement).dataset.col || '0', 10);
        this.toggleSort(col);
      });
    });

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.renderVisibleRows();
      }
    }, { root: null, rootMargin: `${this.overscan * this.rowHeight}px` });

    const topSensor = this.shadowRoot!.querySelector('.sensor-top')!;
    const bottomSensor = this.shadowRoot!.querySelector('.sensor-bottom')!;
    this.observer.observe(topSensor);
    this.observer.observe(bottomSensor);

    this.addEventListener('scroll', () => this.scheduleRender(), { passive: true });

    if (this._boundDataRef) {
      this.renderVisibleRows();
    } else {
      this.loadSlotData();
    }
  }

  protected applyData(data: TableData): void {
    if (data?.columns) {
      this.columns = data.columns;
      this.renderHeader();
    }
    if (data?.rows) {
      this.rows = data.rows;
      this.totalRows = data.total ?? data.rows.length;
    } else if (Array.isArray(data)) {
      this.rows = data;
      this.totalRows = data.length;
    }
    this.renderVisibleRows();
  }

  private renderHeader(): void {
    const thead = this.shadowRoot!.querySelector('thead tr');
    if (!thead) return;
    thead.innerHTML = this.columns.map((c, i) => `<th data-col="${i}">${c}</th>`).join('');
    this.shadowRoot!.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const col = parseInt((th as HTMLElement).dataset.col || '0', 10);
        this.toggleSort(col);
      });
    });
    const colspan = this.columns.length || 1;
    const topSensor = this.shadowRoot!.querySelector('.sensor-top td') as HTMLElement;
    const bottomSensor = this.shadowRoot!.querySelector('.sensor-bottom td') as HTMLElement;
    if (topSensor) topSensor.setAttribute('colspan', String(colspan));
    if (bottomSensor) bottomSensor.setAttribute('colspan', String(colspan));
  }

  private _sortCol = -1;
  private _sortDir: 'asc' | 'desc' = 'asc';

  private toggleSort(col: number): void {
    if (this._sortCol === col) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortCol = col;
      this._sortDir = 'asc';
    }
    const key = this.columns[col];
    if (!key) return;
    this.rows.sort((a, b) => {
      const va = a[key] || '', vb = b[key] || '';
      const na = parseFloat(va), nb = parseFloat(vb);
      const cmp = isNaN(na) || isNaN(nb) ? va.localeCompare(vb) : na - nb;
      return this._sortDir === 'asc' ? cmp : -cmp;
    });
    this.shadowRoot!.querySelectorAll('th').forEach((th, i) => {
      th.classList.toggle('sorted-asc', i === col && this._sortDir === 'asc');
      th.classList.toggle('sorted-desc', i === col && this._sortDir === 'desc');
    });
    this.renderVisibleRows();
  }

  private scheduleRender(): void {
    if (this.scrollRaf) return;
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0;
      this.renderVisibleRows();
    });
  }

  private loadSlotData(): void {
    const slotRows = Array.from(this.querySelectorAll('[data-row]'));
    if (slotRows.length > 0) {
      this.rows = slotRows.map(el => {
        const row: Record<string, string> = {};
        (el as HTMLElement).querySelectorAll('td').forEach((td, i) => {
          row[this.columns[i] || `col${i}`] = td.textContent || '';
        });
        return row;
      });
    }
    this.totalRows = Math.max(this.rows.length, parseInt(this.getAttribute('total') || '0', 10));
    this.renderVisibleRows();
  }

  private renderVisibleRows(): void {
    const containerHeight = this.clientHeight || 400;
    const scrollTop = this.scrollTop;
    const startIdx = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.overscan);
    const visibleCount = Math.ceil(containerHeight / this.rowHeight) + this.overscan * 2;
    const endIdx = Math.min(this.totalRows, startIdx + visibleCount);

    const tbody = this.shadowRoot!.querySelector('.body-wrap')!;
    const topSensor = tbody.querySelector('.sensor-top')!;
    const bottomSensor = tbody.querySelector('.sensor-bottom')!;

    while (tbody.firstChild && tbody.firstChild !== topSensor) {
      tbody.removeChild(tbody.firstChild);
    }
    while (tbody.lastChild && tbody.lastChild !== bottomSensor) {
      tbody.removeChild(tbody.lastChild);
    }

    (topSensor as HTMLElement).style.height = `${startIdx * this.rowHeight}px`;
    (bottomSensor as HTMLElement).style.height = `${(this.totalRows - endIdx) * this.rowHeight}px`;

    const targetEl = bottomSensor as HTMLElement;
    for (let i = startIdx; i < endIdx; i++) {
      const row = this.rows[i];
      if (!row) continue;
      const tr = document.createElement('tr');
      tr.innerHTML = this.columns.map(c => {
        const val = row[c] ?? '';
        return `<td>${this.escapeHtml(String(val))}</td>`;
      }).join('');
      tr.querySelectorAll('td').forEach(td => (td as HTMLElement).style.height = `${this.rowHeight}px`);
      targetEl.before(tr);
    }
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  protected onDisconnected(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.scrollRaf) {
      cancelAnimationFrame(this.scrollRaf);
      this.scrollRaf = 0;
    }
    super.onDisconnected();
  }
}

interface TableData {
  columns?: string[];
  rows?: Record<string, string>[];
  total?: number;
}
