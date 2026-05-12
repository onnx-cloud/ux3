import { UxBase } from '@ux3/ui/widget/primitives/base';

export class UxPivotTable extends UxBase {
  private data: Record<string, any>[] = [];
  private rows: string[] = [];
  private cols: string[] = [];
  private values: string[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.rows = this.getAttribute('rows')?.split(',').map(c => c.trim()) || [];
    this.cols = this.getAttribute('cols')?.split(',').map(c => c.trim()) || [];
    this.values = (this.getAttribute('values') || this.getAttribute('value'))?.split(',').map(c => c.trim()) || [];
    if (!this._boundDataRef) {
      this.data = Array.from(this.querySelectorAll('[data-row]')).map(el => {
        const row: Record<string, any> = {};
        for (const attr of (el as HTMLElement).attributes) {
          if (attr.name.startsWith('data-') && attr.name !== 'data-row') {
            row[attr.name.slice(5)] = attr.value;
          }
        }
        return row;
      });
    }
    if (this.rows.length && this.values.length) {
      this.renderPivot();
    } else {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = '<slot></slot>';
    }
  }

  protected applyData(data: any): void {
    if (Array.isArray(data)) {
      if (!this.rows.length || !this.values.length) return;
      this.data = data;
      this.renderPivot();
    } else if (data && Array.isArray(data.data)) {
      if (data.rows) this.rows = Array.isArray(data.rows) ? data.rows : String(data.rows).split(',').map((c: string) => c.trim());
      if (data.cols) this.cols = Array.isArray(data.cols) ? data.cols : String(data.cols).split(',').map((c: string) => c.trim());
      if (data.values || data.value) this.values = String(data.values || data.value).split(',').map((c: string) => c.trim());
      this.data = data.data;
      this.renderPivot();
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
    const aggregation = this.getAttribute('aggregation') || 'sum';

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
        const val = this.aggregate(subset, valKey, aggregation);
        if (col || !this.cols.length) html += `<td>${val}</td>`;
      }
      totalForAll += this.aggregate(rows, valKey, 'sum');
      html += '</tr>';
    }

    html += `<tfoot><tr><td colspan="${this.rows.length}" style="text-align:left">Total</td>`;
    if (allCols[0] !== '') {
      for (const col of allCols) {
        const val = this.aggregate(this.data.filter(r => this.cols.map(c => r[c]).join('|') === col), valKey, aggregation);
        html += `<td>${val}</td>`;
      }
    } else {
      html += `<td>${totalForAll}</td>`;
    }
    html += '</tr></tfoot></table>';

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html;
  }

  private aggregate(rows: Record<string, any>[], key: string, agg: string): number {
    const values = rows.map(r => parseFloat(r[key]) || 0);
    switch (agg) {
      case 'count': return values.length;
      case 'avg': return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min': return values.length ? Math.min(...values) : 0;
      case 'max': return values.length ? Math.max(...values) : 0;
      default: return values.reduce((a, b) => a + b, 0);
    }
  }
}
import { UxBase } from '@ux3/ui/widget/primitives/base';

export class UxPivotTable extends UxBase {
  private data: Record<string, any>[] = [];
  private rows: string[] = [];
  private cols: string[] = [];
  private values: string[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.rows = this.getAttribute('rows')?.split(',').map(c => c.trim()) || [];
    this.cols = this.getAttribute('cols')?.split(',').map(c => c.trim()) || [];
    this.values = (this.getAttribute('values') || this.getAttribute('value'))?.split(',').map(c => c.trim()) || [];
    if (!this._boundDataRef) {
      this.data = Array.from(this.querySelectorAll('[data-row]')).map(el => {
        const row: Record<string, any> = {};
        for (const attr of (el as HTMLElement).attributes) {
          if (attr.name.startsWith('data-') && attr.name !== 'data-row') {
            row[attr.name.slice(5)] = attr.value;
          }
        }
        return row;
      });
    }
    if (this.rows.length && this.values.length) {
      this.renderPivot();
    } else {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = '<slot></slot>';
    }
  }

  protected applyData(data: any): void {
    if (Array.isArray(data)) {
      if (!this.rows.length || !this.values.length) return;
      this.data = data;
      this.renderPivot();
    } else if (data && Array.isArray(data.data)) {
      if (data.rows) this.rows = Array.isArray(data.rows) ? data.rows : String(data.rows).split(',').map((c: string) => c.trim());
      if (data.cols) this.cols = Array.isArray(data.cols) ? data.cols : String(data.cols).split(',').map((c: string) => c.trim());
      if (data.values || data.value) this.values = String(data.values || data.value).split(',').map((c: string) => c.trim());
      this.data = data.data;
      this.renderPivot();
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
    const aggregation = this.getAttribute('aggregation') || 'sum';

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
        const val = this.aggregate(subset, valKey, aggregation);
        if (col || !this.cols.length) html += `<td>${val}</td>`;
      }
      totalForAll += this.aggregate(rows, valKey, 'sum');
      html += '</tr>';
    }

    html += `<tfoot><tr><td colspan="${this.rows.length}" style="text-align:left">Total</td>`;
    if (allCols[0] !== '') {
      for (const col of allCols) {
        const val = this.aggregate(this.data.filter(r => this.cols.map(c => r[c]).join('|') === col), valKey, aggregation);
        html += `<td>${val}</td>`;
      }
    } else {
      html += `<td>${totalForAll}</td>`;
    }
    html += '</tr></tfoot></table>';

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html;
  }

  private aggregate(rows: Record<string, any>[], key: string, agg: string): number {
    const values = rows.map(r => parseFloat(r[key]) || 0);
    switch (agg) {
      case 'count': return values.length;
      case 'avg': return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min': return values.length ? Math.min(...values) : 0;
      case 'max': return values.length ? Math.max(...values) : 0;
      default: return values.reduce((a, b) => a + b, 0);
    }
  }
}
