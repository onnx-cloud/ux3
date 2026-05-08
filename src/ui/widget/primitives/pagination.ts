import { UxBase } from './base.js';

export class UxPagination extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const current = parseInt(this.getAttribute('current') || '1', 10);
    const total = parseInt(this.getAttribute('total') || '1', 10);

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          --_pg-bg: var(--ux-pg-bg, #fff);
          --_pg-border: var(--ux-pg-border, #d1d5db);
          --_pg-active-bg: var(--ux-pg-active-bg, #3b82f6);
          --_pg-active-color: var(--ux-pg-active-color, #fff);
          display: flex; align-items: center; gap: 0.25rem;
        }
        button {
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--_pg-border);
          background: var(--_pg-bg);
          border-radius: 0.25rem; cursor: pointer; font: inherit;
        }
        button:hover:not(:disabled) { filter: brightness(0.95); }
        button:disabled { opacity: 0.5; cursor: default; }
        .active { font-weight: 600; background: var(--_pg-active-bg); color: var(--_pg-active-color); border-color: var(--_pg-active-bg); }
        .info { padding: 0 0.5rem; color: #6b7280; font-size: 0.875rem; }
      </style>
      <button data-action="PREV" ${current <= 1 ? 'disabled' : ''}>Prev</button>
      ${this.pageButtons(current, total)}
      <button data-action="NEXT" ${current >= total ? 'disabled' : ''}>Next</button>
      <span class="info">${current} / ${total}</span>
    `;

    this.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (btn) {
        const action = btn.getAttribute('data-action')!;
        const page = btn.getAttribute('data-page');
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action, page: page ? parseInt(page, 10) : undefined }
        }));
      }
    });
  }

  private pageButtons(current: number, total: number): string {
    let h = '';
    for (let i = 1; i <= total; i++) {
      h += `<button data-action="GOTO" data-page="${i}"${i === current ? ' class="active"' : ''}>${i}</button>`;
    }
    return h;
  }
}
