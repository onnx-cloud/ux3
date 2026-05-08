import { UxBase } from './base.js';

export class UxSearchBar extends UxBase {
  private input!: HTMLInputElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected onConnected(): void {
    super.onConnected();
    const debounce = parseInt(this.getAttribute('debounce') || '300', 10);

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0 0.75rem; background: white; }
        :host(:focus-within) { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
        .icon { color: #9ca3af; margin-right: 0.5rem; }
        input { border: none; padding: 0.5rem 0; outline: none; flex: 1; font: inherit; }
        .clear { display: none; background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 1rem; }
        .clear.visible { display: inline; }
      </style>
      <span class="icon">\uD83D\uDD0D</span>
      <input type="search" placeholder="Search...">
      <button class="clear">&times;</button>
    `;

    this.input = this.shadowRoot!.querySelector('input')!;
    const clear = this.shadowRoot!.querySelector('.clear')!;

    this.input.addEventListener('input', () => {
      clear.classList.toggle('visible', this.input.value.length > 0);
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.emit(), debounce);
    });

    clear.addEventListener('click', () => {
      this.input.value = '';
      clear.classList.remove('visible');
      this.emit();
    });
  }

  private emit(): void {
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action: 'SEARCH', query: this.input.value }
    }));
  }
}
