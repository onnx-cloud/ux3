import { UxBase } from './base.js';

export class UxDataGrid extends UxBase {
  private tableRows: { rowId: string; cells: { text: string; isHeader: boolean }[] }[] = [];
  private _sortCol = -1;
  private _sortDir: 'asc' | 'desc' = 'asc';
  private tableEl!: HTMLTableElement;

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; overflow: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 0.5rem; border: 1px solid var(--ux-dg-border, #e5e7eb); text-align: left; font-size: 0.8125rem; }
        th {
          background: var(--ux-dg-header, #f9fafb); font-weight: 600;
          cursor: pointer; user-select: none;
        }
        th:hover { background: var(--ux-dg-header-hover, #f3f4f6); }
        th.sorted-asc::after { content: ' ▲'; font-size: 0.625rem; }
        th.sorted-desc::after { content: ' ▼'; font-size: 0.625rem; }
        tr:nth-child(even) td { background: var(--ux-dg-stripe, #f9fafb); }
        tr:hover td { background: var(--ux-dg-hover, #f3f4f6); }
        td.editing { padding: 0; }
        td input { border: none; padding: 0.5rem; width: 100%; box-sizing: border-box; font: inherit; font-size: 0.8125rem; }
      </style>
      <table></table>
    `;
    this.tableEl = this.shadowRoot!.querySelector('table')!;

    this.shadowRoot!.addEventListener('dblclick', (e) => this.onCellDblClick(e));
    this.shadowRoot!.addEventListener('click', (e) => this.onHeaderClick(e));

    if (this._boundDataRef) {
      this.applyData(this._boundDataRef);
    } else {
      this.loadSlotData();
    }
  }

  protected applyData(data: GridData): void {
    if (data?.columns) {
      this.tableRows = [{
        rowId: '',
        cells: data.columns.map(c => ({ text: c, isHeader: true })),
      }];
      if (data?.rows) {
        for (const row of data.rows) {
          this.tableRows.push({
            rowId: row.id ?? row[data.columns[0]] ?? '',
            cells: data.columns.map(c => ({ text: String(row[c] ?? ''), isHeader: false })),
          });
        }
      }
    } else {
      this.loadSlotData();
      return;
    }
    this.renderTable();
  }

  private loadSlotData(): void {
    const rows = Array.from(this.querySelectorAll('tr'));
    if (rows.length === 0) return;
    this.tableRows = rows.map(tr => ({
      rowId: (tr as HTMLElement).dataset.row || '',
      cells: Array.from(tr.querySelectorAll('td, th')).map(cell => ({
        text: cell.textContent || '',
        isHeader: cell.tagName === 'TH',
      })),
    }));
    this.renderTable();
  }

  private renderTable(): void {
    this.tableEl.innerHTML = '';
    for (const row of this.tableRows) {
      const tr = document.createElement('tr');
      if (row.rowId) tr.dataset.row = row.rowId;
      for (let i = 0; i < row.cells.length; i++) {
        const cell = row.cells[i];
        const el = document.createElement(cell.isHeader ? 'th' : 'td');
        el.textContent = cell.text;
        if (cell.isHeader) { (el as HTMLElement).dataset.col = String(i); }
        tr.appendChild(el);
      }
      this.tableEl.appendChild(tr);
    }
    this.applySortIndicators();
  }

  private onHeaderClick(e: Event): void {
    const th = (e.target as HTMLElement).closest('th');
    if (!th) return;
    const col = parseInt((th as HTMLElement).dataset.col || '-1', 10);
    if (col < 0) return;
    this.toggleSort(col);
  }

  private toggleSort(col: number): void {
    if (this._sortCol === col) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortCol = col;
      this._sortDir = 'asc';
    }
    const dataRows = this.tableRows.filter(r => !r.cells[0]?.isHeader);
    const headerRow = this.tableRows.find(r => r.cells[0]?.isHeader);
    dataRows.sort((a, b) => {
      const va = a.cells[col]?.text || '';
      const vb = b.cells[col]?.text || '';
      const na = parseFloat(va), nb = parseFloat(vb);
      const cmp = isNaN(na) || isNaN(nb) ? va.localeCompare(vb) : na - nb;
      return this._sortDir === 'asc' ? cmp : -cmp;
    });
    this.tableRows = headerRow ? [headerRow, ...dataRows] : dataRows;
    this.renderTable();
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action: 'GRID:SORT', column: col, direction: this._sortDir },
    }));
  }

  private applySortIndicators(): void {
    const ths = this.tableEl.querySelectorAll('th');
    ths.forEach((th, i) => {
      th.classList.toggle('sorted-asc', i === this._sortCol && this._sortDir === 'asc');
      th.classList.toggle('sorted-desc', i === this._sortCol && this._sortDir === 'desc');
    });
  }

  private onCellDblClick(e: Event): void {
    const td = (e.target as HTMLElement).closest('td');
    if (!td || td.querySelector('input')) return;
    const val = td.textContent || '';
    td.classList.add('editing');
    td.innerHTML = `<input value="${this.escapeAttr(val)}">`;
    const input = td.querySelector('input')!;
    input.focus();
    input.addEventListener('blur', () => {
      td.classList.remove('editing');
      td.textContent = input.value || val;
      const rowEl = td.parentElement as HTMLElement;
      this.dispatchEvent(new CustomEvent('ux:event', {
        bubbles: true, composed: true,
        detail: { action: 'GRID:EDIT', row: rowEl?.dataset?.row, col: td.cellIndex, value: input.value },
      }));
    });
    input.addEventListener('keydown', (ke) => {
      if (ke.key === 'Enter') input.blur();
      if (ke.key === 'Escape') { td.classList.remove('editing'); td.textContent = val; }
    });
  }

  private escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

interface GridData {
  columns?: string[];
  rows?: Record<string, any>[];
}
