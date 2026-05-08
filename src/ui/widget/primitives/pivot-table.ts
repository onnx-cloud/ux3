import { UxBase } from './base.js';

export class UxPivotTable extends UxBase {
  private data: Record<string, any>[] = [];
  private rows: string[] = [];
  private cols: string[] = [];
  private values: string[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.rows = this.getAttribute('rows')?.split(',').map(c => c.trim()) || [];
    this.cols = this.getAttribute('cols')?.split(',').map(c => c.trim()) || [];
    this.values = this.getAttribute('values')?.split(',').map(c => c.trim()) || [];
    this.data = Array.from(this.querySelectorAll('[data-row]')).map(el => {
      const row: Record<string, any> = {};
      for (const attr of (el as HTMLElement).attributes) {
        if (attr.name.startsWith('data-') && attr.name !== 'data-row') {
          row[attr.name.slice(5)] = attr.value;
        }
      }
      return row;
    });

    if (this.rows.length && this.values.length) {
      this.renderPivot();
    } else {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = '<slot></slot>';
    }
  }

  private renderPivot(): void {
    // Group by rows
    const groups = new Map<string, Record<string, any>[]>();
    for (const row of this.data) {
      const key = this.rows.map(r => row[r]).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const allCols = this.cols.length ? [...new Set(this.data.map(r => this.cols.map(c => r[c]).join('|')))] : [''];
    const valKey = this.values[0];

    let html = '<style>:host{display:block;overflow:auto;}table{border-collapse:collapse;width:100%}th,td{padding:0.5rem;border:1px solid #e5e7eb;font-size:0.8125rem;text-align:right}th{background:#f9fafb;font-weight:600}tfoot td{font-weight:600;background:#f9fafb}</style><table>';
    html += '<thead><tr>' + this.rows.map(r => `<th>${r}</th>`).join('');

    if (allCols.length > 0 && allCols[0] !== '') {
      html += allCols.map(c => `<th>${c}</th>`).join('');
    }
    if (allCols[0] === '' || !this.cols.length) {
      html += `<th>${valKey}</th>`;
    }
    html += '</tr></thead><tbody>';

    let totalForAll = 0;
    for (const [key, rows] of groups) {
      const parts = key.split('|');
      html += '<tr>' + parts.map(p => `<td>${p}</td>`).join('');

      for (const col of allCols) {
        const subset = col ? rows.filter(r => this.cols.map(c => r[c]).join('|') === col) : rows;
        const sum = subset.reduce((acc, r) => acc + (parseFloat(r[valKey]) || 0), 0);
        if (col || !this.cols.length) html += `<td>${sum}</td>`;
      }
      totalForAll += rows.reduce((acc, r) => acc + (parseFloat(r[valKey]) || 0), 0);
      html += '</tr>';
    }

    html += `<tfoot><tr><td colspan="${this.rows.length}" style="text-align:left">Total</td>`;
    if (allCols[0] !== '') {
      for (const col of allCols) {
        const sum = this.data.filter(r => this.cols.map(c => r[c]).join('|') === col).reduce((a, r) => a + (parseFloat(r[valKey]) || 0), 0);
        html += `<td>${sum}</td>`;
      }
    } else {
      html += `<td>${totalForAll}</td>`;
    }
    html += '</tr></tfoot></table>';

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html;
  }
}
