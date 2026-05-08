import { UxBase } from './base.js';

export class UxComboBox extends UxBase {
  private input!: HTMLInputElement;
  private list!: HTMLDivElement;
  private options: string[] = [];
  private selected = -1;
  private isOpen = false;

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-block; position: relative; }
        .wrapper { display: flex; border: 1px solid #d1d5db; border-radius: 0.375rem; }
        .wrapper:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
        input { border: none; padding: 0.5rem 0.75rem; flex: 1; outline: none; font: inherit; }
        input:focus { outline: none; }
        .toggle { padding: 0.5rem; background: none; border: none; cursor: pointer; color: #6b7280; }
        .dropdown {
          display: none; position: absolute; top: 100%; left: 0; right: 0;
          background: white; border: 1px solid #d1d5db; border-radius: 0.375rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; max-height: 200px; overflow-y: auto;
        }
        .open .dropdown { display: block; }
        .option { padding: 0.5rem 0.75rem; cursor: pointer; }
        .option:hover, .option.selected { background: #f3f4f6; }
        .empty { padding: 0.5rem 0.75rem; color: #9ca3af; }
      </style>
      <div class="wrapper">
        <input type="text" placeholder="Select or search...">
        <button class="toggle" aria-label="Toggle">\u25BC</button>
      </div>
      <div class="dropdown"><div class="list"></div></div>
    `;

    this.input = this.shadowRoot!.querySelector('input')!;
    this.list = this.shadowRoot!.querySelector('.list')!;
    this.options = Array.from(this.querySelectorAll('[data-option]')).map(el => (el as HTMLElement).dataset.option || el.textContent || '');

    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.shadowRoot!.querySelector('.toggle')!.addEventListener('click', () => this.toggle());
    this.input.addEventListener('focus', () => { this.isOpen = true; this.render(); });
    this.input.addEventListener('blur', () => setTimeout(() => { this.isOpen = false; this.render(); }, 200));
    this.list.addEventListener('click', (e) => {
      const opt = (e.target as HTMLElement).closest('.option') as HTMLElement;
      if (opt) this.select(parseInt(opt.dataset.index!, 10));
    });
  }

  private toggle(): void { this.isOpen = !this.isOpen; this.render(); }

  private filter(): void {
    this.selected = -1;
    this.render();
  }

  private render(): void {
    const q = this.input.value.toLowerCase();
    const filtered = this.options.filter(o => o.toLowerCase().includes(q));
    const wrapper = this.shadowRoot!.querySelector('.wrapper')!;
    wrapper.classList.toggle('open', this.isOpen);
    this.list.innerHTML = filtered.length
      ? filtered.map((o, i) => `<div class="option${i === this.selected ? ' selected' : ''}" data-index="${i}">${o}</div>`).join('')
      : '<div class="empty">No results</div>';
  }

  private onKey(e: KeyboardEvent): void {
    const opts = this.shadowRoot!.querySelectorAll('.option');
    if (e.key === 'ArrowDown') { e.preventDefault(); this.selected = Math.min(this.selected + 1, opts.length - 1); this.render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.selected = Math.max(this.selected - 1, 0); this.render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (this.selected >= 0) this.select(this.selected); }
    else if (e.key === 'Escape') { this.isOpen = false; this.render(); }
  }

  private select(index: number): void {
    const opts = this.shadowRoot!.querySelectorAll('.option');
    if (index < 0 || index >= opts.length) return;
    const label = (opts[index] as HTMLElement).textContent || '';
    this.input.value = label;
    this.isOpen = false;
    this.render();
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action: 'SELECT', value: label }
    }));
  }
}
