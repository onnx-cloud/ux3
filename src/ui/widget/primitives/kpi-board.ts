import { UxBase } from './base.js';

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
        .kpi-delta { font-size: 0.75rem; margin-top: 0.25rem; }
        .kpi-delta.up { color: #10b981; }
        .kpi-delta.down { color: #ef4444; }
      </style>
      <slot></slot>
    `;
  }
}
