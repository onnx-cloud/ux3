import { UxBase } from './base.js';

export class UxTable extends UxBase {
  private sortColumn = -1;
  private sortAsc = true;

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'table');
    this.setupSort();
  }

  protected applyData(data: any): void {
    if (!data) return;
    let rows: Record<string, string>[] = [];
    let cols: string[] = [];
    if (Array.isArray(data)) {
      rows = data;
      cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    } else if (data.columns && Array.isArray(data.rows)) {
      cols = data.columns;
      rows = data.rows;
    } else {
      return;
    }
    let table = this.querySelector('table') as HTMLTableElement | null;
    if (!table) {
      table = document.createElement('table');
      this.appendChild(table);
    }
    let html = '<thead><tr>';
    for (const c of cols) html += `<th>${c}</th>`;
    html += '</tr></thead><tbody>';
    for (const r of rows) {
      html += '<tr>';
      for (const c of cols) html += `<td>${r[c] ?? ''}</td>`;
      html += '</tr>';
    }
    html += '</tbody>';
    table.innerHTML = html;
    this.setupSort();
  }

  private setupSort(): void {
    const table = this.querySelector('table');
    if (!table) return;
    const headers = table.querySelectorAll('th');
    headers.forEach((th, i) => {
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      th.addEventListener('click', () => this.sortBy(i));
    });
  }

  private sortBy(column: number): void {
    const table = this.querySelector('table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }

    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const cellA = a.children[column]?.textContent?.trim() || '';
      const cellB = b.children[column]?.textContent?.trim() || '';
      const numA = parseFloat(cellA);
      const numB = parseFloat(cellB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return this.sortAsc ? numA - numB : numB - numA;
      }
      return this.sortAsc
        ? cellA.localeCompare(cellB)
        : cellB.localeCompare(cellA);
    });

    rows.forEach(row => tbody.appendChild(row));
    this.updateSortIndicators(table);
    this.dispatchEvent(new CustomEvent('ux:sort', {
      bubbles: true, composed: true,
      detail: { column, ascending: this.sortAsc },
    }));
  }

  private updateSortIndicators(table: HTMLTableElement): void {
    const headers = table.querySelectorAll('th');
    headers.forEach((th, i) => {
      const existing = th.querySelector('.ux-sort-arrow');
      if (existing) existing.remove();
      if (i === this.sortColumn) {
        const arrow = document.createElement('span');
        arrow.className = 'ux-sort-arrow';
        arrow.textContent = this.sortAsc ? '\u25B2' : '\u25BC';
        arrow.style.cssText = 'display:inline-block;width:1em;font-size:0.65em;margin-left:4px;';
        th.appendChild(arrow);
      }
    });
  }
}
