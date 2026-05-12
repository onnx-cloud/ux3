/**
 * UX3 ComboBox Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-combobox-style';
const STYLE_CSS = `    ux-combobox { display: inline-block; position: relative; }
    ux-combobox .wrapper { display: flex; border: 1px solid #d1d5db; border-radius: 0.375rem; }
    ux-combobox .wrapper:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
    ux-combobox input { border: none; padding: 0.5rem 0.75rem; flex: 1; outline: none; font: inherit; }
    ux-combobox .toggle { padding: 0.5rem; background: none; border: none; cursor: pointer; color: #6b7280; }
    ux-combobox .dropdown { display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; max-height: 200px; overflow-y: auto; }
    ux-combobox .open .dropdown { display: block; }
    ux-combobox .option { padding: 0.5rem 0.75rem; cursor: pointer; }
    ux-combobox .option:hover, ux-combobox .option.selected { background: #f3f4f6; }
    ux-combobox .empty { padding: 0.5rem 0.75rem; color: #9ca3af; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxComboBox extends UxBase {
  private input!: HTMLInputElement;
  private list!: HTMLDivElement;
  private wrapper!: HTMLDivElement;
  private options: string[] = [];
  private selected = -1;
  private isOpen = false;

  protected onConnected(): void {
    super.onConnected();
    this.readSlotOptions();
    this.build();
  }

  protected applyData(data: any): void {
    if (typeof data === 'string' || typeof data === 'number') {
      this.input.value = String(data);
    } else if (data && typeof data === 'object') {
      if ('value' in data && this.input) this.input.value = String(data.value ?? '');
      if (Array.isArray(data.options)) {
        this.options = data.options.map((o: any) => typeof o === 'string' ? o : o.label ?? o.value ?? '');
        this.render();
      }
    }
  }

  private readSlotOptions(): void {
    this.options = Array.from(this.querySelectorAll('[data-option]')).map(
      el => (el as HTMLElement).dataset.option || el.textContent || ''
    );
  }

  private build(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'wrapper';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.setAttribute('placeholder', 'Select or search...');

    const toggle = document.createElement('button');
    toggle.className = 'toggle';
    toggle.setAttribute('aria-label', 'Toggle');
    toggle.textContent = '\u25BC';

    this.wrapper.appendChild(this.input);
    this.wrapper.appendChild(toggle);

    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    this.list = document.createElement('div');
    this.list.className = 'list';
    dropdown.appendChild(this.list);
    this.wrapper.appendChild(dropdown);

    this.innerHTML = '';
    this.appendChild(this.wrapper);

    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    toggle.addEventListener('click', () => this.toggle());
    this.input.addEventListener('focus', () => { this.isOpen = true; this.render(); });
    this.input.addEventListener('blur', () => setTimeout(() => { this.isOpen = false; this.render(); }, 200));
    this.list.addEventListener('click', (e) => {
      const opt = (e.target as HTMLElement).closest('.option') as HTMLElement;
      if (opt) this.select(parseInt(opt.dataset.index!, 10));
    });

    this.render();
  }

  private toggle(): void { this.isOpen = !this.isOpen; this.render(); }

  private filter(): void { this.selected = -1; this.render(); }

  private render(): void {
    const q = this.input.value.toLowerCase();
    const filtered = this.options.filter(o => o.toLowerCase().includes(q));
    this.wrapper.classList.toggle('open', this.isOpen);
    this.list.innerHTML = filtered.length
      ? filtered.map((o, i) => `<div class="option${i === this.selected ? ' selected' : ''}" data-index="${i}">${o}</div>`).join('')
      : '<div class="empty">No results</div>';
  }

  private onKey(e: KeyboardEvent): void {
    const opts = this.list.querySelectorAll('.option');
    if (e.key === 'ArrowDown') { e.preventDefault(); this.selected = Math.min(this.selected + 1, opts.length - 1); this.render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.selected = Math.max(this.selected - 1, 0); this.render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (this.selected >= 0) this.select(this.selected); }
    else if (e.key === 'Escape') { this.isOpen = false; this.render(); }
  }

  private select(index: number): void {
    const opts = this.list.querySelectorAll('.option');
    if (index < 0 || index >= opts.length) return;
    const label = (opts[index] as HTMLElement).textContent || '';
    this.input.value = label;
    this.isOpen = false;
    this.render();
    this.dispatchEvent(new CustomEvent('ux:select.action', {
      bubbles: true, composed: true,
      detail: { action: 'SELECT', value: label },
    }));
  }
}
