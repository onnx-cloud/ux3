import { UxBase } from './base.js';

export class UxBadge extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const variant = this.getAttribute('variant') || 'default';
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; padding: 0.125rem 0.625rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; line-height: 1.25rem; }
        :host(.default) { background: #f3f4f6; color: #374151; }
        :host(.primary) { background: #dbeafe; color: #1e40af; }
        :host(.success) { background: #d1fae5; color: #065f46; }
        :host(.warning) { background: #fef3c7; color: #92400e; }
        :host(.error) { background: #fee2e2; color: #991b1b; }
        :host(.dot) { width: 0.5rem; height: 0.5rem; padding: 0; min-width: 0; }
      </style>
      <slot></slot>
    `;
    this.classList.add(variant);
  }
}
