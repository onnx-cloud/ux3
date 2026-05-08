import { UxBase } from './base.js';

export class UxBreadcrumb extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const separator = this.getAttribute('separator') || '/';
    const segments = (this.getAttribute('path') || '').split('/').filter(Boolean);
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: flex; align-items: center; gap: 0.5rem; font-size: var(--ux-crumb-size, 0.875rem); }
        a { color: var(--ux-crumb-link, #3b82f6); text-decoration: none; }
        a:hover { text-decoration: underline; }
        [aria-current] { color: var(--ux-crumb-current, #6b7280); }
        .sep { color: var(--ux-crumb-sep, #d1d5db); }
      </style>
      ${segments.map((s, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        return i === segments.length - 1
          ? `<span aria-current="page">${s}</span>`
          : `<a href="${href}">${s}</a><span class="sep">${separator}</span>`;
      }).join('') || '<slot></slot>'}
    `;
  }
}
