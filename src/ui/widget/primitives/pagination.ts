/**
 * UX3 Pagination Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-pagination-style';
const STYLE_CSS = `    ux-pagination { display: flex; align-items: center; gap: 0.25rem; }
    ux-pagination button { padding: 0.375rem 0.75rem; border: 1px solid var(--ux-pg-border, #d1d5db); background: var(--ux-pg-bg, #fff); border-radius: 0.25rem; cursor: pointer; font: inherit; font-size: 0.875rem; }
    ux-pagination button:hover:not(:disabled) { filter: brightness(0.95); }
    ux-pagination button:disabled { opacity: 0.5; cursor: default; }
    ux-pagination button.active { font-weight: 600; background: var(--ux-pg-active-bg, var(--color-primary, #6b7280)); color: var(--ux-pg-active-color, #fff); border-color: var(--ux-pg-active-bg, var(--color-primary, #6b7280)); }
    ux-pagination .info { padding: 0 0.5rem; color: var(--color-text-muted, #9ca3af); font-size: 0.875rem; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxPagination extends UxBase {
  private currentPage: number = 1;
  private totalPages: number = 1;
  private _rendered = false;

  protected onConnected(): void {
    super.onConnected();
    this.syncFromAttrs();
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
  }

  protected applyData(data: any): void {
    if (data && typeof data === 'object') {
      if ('current' in data) this.setAttribute('current', String(data.current));
      if ('total' in data) this.setAttribute('total', String(data.total));
      this.syncFromAttrs();
      this.render();
    }
  }

  private syncFromAttrs(): void {
    this.currentPage = parseInt(this.getAttribute('current') || '1', 10);
    this.totalPages = parseInt(this.getAttribute('total') || '1', 10);
  }

  private render(): void {
    const c = this.currentPage;
    const t = this.totalPages;

    this.innerHTML = '';

    const prev = document.createElement('button');
    prev.setAttribute('data-action', 'PREV');
    prev.textContent = 'Prev';
    if (c <= 1) prev.disabled = true;
    this.appendChild(prev);

    if (t <= 7) {
      for (let i = 1; i <= t; i++) this.appendPageButton(i, i === c);
    } else {
      this.appendPageButton(1, c === 1);
      if (c > 3) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'info';
        ellipsis.textContent = '...';
        this.appendChild(ellipsis);
      }
      const start = Math.max(2, c - 1);
      const end = Math.min(t - 1, c + 1);
      for (let i = start; i <= end; i++) this.appendPageButton(i, i === c);
      if (c < t - 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'info';
        ellipsis.textContent = '...';
        this.appendChild(ellipsis);
      }
      this.appendPageButton(t, c === t);
    }

    const next = document.createElement('button');
    next.setAttribute('data-action', 'NEXT');
    next.textContent = 'Next';
    if (c >= t) next.disabled = true;
    this.appendChild(next);

    const info = document.createElement('span');
    info.className = 'info';
    info.textContent = `${c} / ${t}`;
    this.appendChild(info);

    this.addEventListener('click', (e) => this.onPageClick(e));
  }

  private appendPageButton(page: number, active: boolean): void {
    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'GOTO');
    btn.setAttribute('data-page', String(page));
    btn.textContent = String(page);
    if (active) btn.className = 'active';
    this.appendChild(btn);
  }

  private onPageClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    const action = btn.getAttribute('data-action')!;
    const page = btn.getAttribute('data-page');
    const pageNum = page ? parseInt(page, 10) : undefined;

    if (action === 'GOTO' && pageNum) {
      this.currentPage = pageNum;
      this.setAttribute('current', String(pageNum));
      this.render();
    } else if (action === 'PREV' && this.currentPage > 1) {
      this.currentPage--;
      this.setAttribute('current', String(this.currentPage));
      this.render();
    } else if (action === 'NEXT' && this.currentPage < this.totalPages) {
      this.currentPage++;
      this.setAttribute('current', String(this.currentPage));
      this.render();
    }

    this.dispatchEvent(new CustomEvent('ux:pagination.change', {
      bubbles: true, composed: true,
      detail: { action, page: pageNum },
    }));
  }
}
