import { UxBase } from './base.js';

export class UxEmptyState extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--ux-empty-padding, 2rem); text-align: center; }
        .title { font-weight: 600; margin-bottom: 0.25rem; }
        .desc { color: var(--ux-empty-desc, #6b7280); font-size: 0.875rem; }
      </style>
      <slot name="icon"><span style="font-size:2.5rem;opacity:0.4;margin-bottom:0.75rem">&#x1F4AD;</span></slot>
      <slot name="title"><div class="title">No data</div></slot>
      <slot name="description"><div class="desc"></div></slot>
      <slot name="action"></slot>
    `;
  }
}
