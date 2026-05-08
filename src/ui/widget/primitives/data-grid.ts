import { UxBase } from './base.js';

export class UxDataGrid extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; overflow: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 0.5rem; border: 1px solid var(--ux-dg-border, #e5e7eb); text-align: left; font-size: 0.8125rem; }
        th { background: var(--ux-dg-header, #f9fafb); font-weight: 600; }
        td.editing { padding: 0; }
        td input { border: none; padding: 0.5rem; width: 100%; box-sizing: border-box; font: inherit; font-size: 0.8125rem; }
      </style>
      <table><slot></slot></table>
    `;

    this.shadowRoot!.addEventListener('dblclick', (e) => {
      const td = (e.target as HTMLElement).closest('td');
      if (!td || td.querySelector('input')) return;
      const val = td.textContent || '';
      td.classList.add('editing');
      td.innerHTML = `<input value="${val}">`;
      const input = td.querySelector('input')!;
      input.focus();
      input.addEventListener('blur', () => {
        td.classList.remove('editing');
        td.textContent = input.value || val;
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'EDIT', row: (td.parentElement as HTMLElement)?.dataset?.row, col: td.cellIndex, value: input.value }
        }));
      });
      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') input.blur();
        if (ke.key === 'Escape') { td.classList.remove('editing'); td.textContent = val; }
      });
    });
  }
}
