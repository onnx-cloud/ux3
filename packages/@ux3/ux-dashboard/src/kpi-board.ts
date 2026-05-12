import { UxBase } from '../../../../src/ui/widget/primitives/base';

export class UxKpiBoard extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
        .kpi {
          border: 1px solid var(--ux-kpi-border, #e5e7eb);
          border-radius: 0.5rem;
          padding: 1rem;
          background: var(--ux-kpi-bg, #fff);
          text-align: center;
        }
        .kpi-value { font-size: 1.75rem; font-weight: 700; }
        .kpi-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
        .kpi-delta { font-size: 0.75rem; margin-top: 0.25rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem; }
        .kpi-delta.up { color: #10b981; }
        .kpi-delta.down { color: #ef4444; }
      </style>
    `;

    if (this._boundDataRef) {
      this.applyData(this._boundDataRef);
    }
  }

  protected applyData(kpis: KpiItem[]): void {
    if (!Array.isArray(kpis)) return;
    const container = this.shadowRoot;
    if (!container) return;

    let html = '';
    for (const kpi of kpis) {
      const trend = kpi.trend || (kpi.delta?.startsWith('+') ? 'up' : kpi.delta?.startsWith('-') ? 'down' : '');
      const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '';
      html += `<div class="kpi">
        <div class="kpi-value">${this.escape(String(kpi.value || ''))}</div>
        <div class="kpi-label">${this.escape(kpi.label || '')}</div>
        ${kpi.delta ? `<div class="kpi-delta ${trend}">${arrow} ${this.escape(kpi.delta)}</div>` : ''}
      </div>`;
    }

    const existing = container.querySelector('.kpi');
    if (existing) existing.parentElement?.remove();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    while (wrapper.firstChild) container.appendChild(wrapper.firstChild);
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

interface KpiItem {
  label: string;
  value: string;
  delta?: string;
  trend?: string;
}
