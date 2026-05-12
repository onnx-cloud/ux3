import { UxBase } from '../../../../src/ui/widget/primitives/base';

export class UxReportBuilder extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        .report { overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; }
        td, th { padding: 0.5rem; border: 1px solid var(--ux-cal-border, #e5e7eb); font-size: 0.8125rem; }
      </style>
      <div class="report">
        <slot></slot>
      </div>
    `;
    this.renderData();
  }

  protected applyData(data: any): void {
    if (Array.isArray(data)) {
      this.renderTable(data);
    }
  }

  private renderData(): void {
    const slotRows = Array.from(this.querySelectorAll('[data-row]'));
    if (slotRows.length) this.renderFromSlots(slotRows);
  }

  private renderFromSlots(rows: Element[]): void {
    const report = this.shadowRoot!.querySelector('.report') as HTMLElement;
    if (!report) return;
    let html = '<table><tbody>';
    for (const row of rows) {
      html += '<tr>' + row.innerHTML + '</tr>';
    }
    html += '</tbody></table>';
    report.innerHTML = html;
  }

  private renderTable(data: Record<string, any>[]): void {
    if (!data.length) return;
    const report = this.shadowRoot!.querySelector('.report') as HTMLElement;
    if (!report) return;
    const cols = Object.keys(data[0]);
    let html = '<table><thead><tr>';
    for (const c of cols) html += `<th>${c}</th>`;
    html += '</tr></thead><tbody>';
    for (const r of data) {
      html += '<tr>';
      for (const c of cols) html += `<td>${r[c] ?? ''}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    report.innerHTML = html;
  }
}
