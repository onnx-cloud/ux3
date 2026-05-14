import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-combobox-style';
const STYLE_CSS = `    ux-combobox { display: inline-block; position: relative; }
    ux-combobox .wrapper { display: flex; border: 1px solid #d1d5db; border-radius: 0.375rem; }
    ux-combobox .wrapper:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
    ux-combobox input { border: none; padding: 0.5rem 0.75rem; flex: 1; outline: none; font: inherit; }
    ux-combobox input:disabled { background: #f9fafb; cursor: not-allowed; opacity: 0.6; }
    ux-combobox .toggle { padding: 0.5rem; background: none; border: none; cursor: pointer; color: #6b7280; }
    ux-combobox .dropdown { display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; max-height: 200px; overflow-y: auto; }
    ux-combobox .open .dropdown { display: block; }
    ux-combobox .option { padding: 0.5rem 0.75rem; cursor: pointer; }
    ux-combobox .option:hover, ux-combobox .option.selected { background: #f3f4f6; }
    ux-combobox .option.disabled { opacity: 0.5; cursor: not-allowed; }
    ux-combobox .empty { padding: 0.5rem 0.75rem; color: #9ca3af; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export interface ComboOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export class UxComboBox extends UxBase {
  private input!: HTMLInputElement;
  private list!: HTMLDivElement;
  private wrapper!: HTMLDivElement;
  private options: ComboOption[] = [];
  private selected = -1;
  private isOpen = false;
  private _built = false;
  private _ignoreNextInput = false;

  static get observedAttributes(): string[] {
    return ['value', 'name', 'disabled', 'required', 'placeholder'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this._built) {
      this._built = true;
      this.readSlotOptions();
      this.build();
    }
  }

  protected onDisconnected(): void {
    if (this.input) {
      this.input.removeEventListener('input', this._onInput);
      this.input.removeEventListener('keydown', this._onKey);
      this.input.removeEventListener('focus', this._onFocus);
      this.input.removeEventListener('blur', this._onBlur);
    }
    if (this.list) {
      this.list.removeEventListener('mousedown', this._onListMouseDown);
    }
    const toggle = this.querySelector('button.toggle');
    if (toggle) {
      toggle.removeEventListener('click', this._onToggle);
    }
    super.onDisconnected();
  }

  private readonly _onInput = (): void => {
    if (this._ignoreNextInput) return;
    this.filter();
  };

  private readonly _onKey = (e: Event): void => {
    this.onKey(e as KeyboardEvent);
  };

  private readonly _onFocus = (): void => {
    this.isOpen = true; this.render();
  };

  private readonly _onBlur = (): void => {
    setTimeout(() => { if (this.isOpen) { this.isOpen = false; this.render(); } }, 200);
  };

  private readonly _onListMouseDown = (e: Event): void => {
    const opt = (e.target as HTMLElement).closest('.option:not(.disabled)') as HTMLElement;
    if (opt) {
      const index = parseInt(opt.dataset.index || '-1', 10);
      if (index >= 0 && index < this.options.length && !this.options[index].disabled) {
        this.select(index);
      }
    }
  };

  private readonly _onToggle = (): void => {
    this.toggle();
  };

  protected applyData(data: any): void {
    if (typeof data === 'string' || typeof data === 'number') {
      this.setValue(String(data));
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.options)) {
        this.options = data.options.map((o: any) => {
          if (typeof o === 'string') return { label: o, value: o };
          return {
            label: o.label ?? o.value ?? '',
            value: o.value ?? o.label ?? '',
            disabled: o.disabled ?? false,
          };
        });
        this.render();
      }
      if ('value' in data && this.input) {
        this.setValue(String(data.value ?? ''));
      }
    }
  }

  protected onAttributeChanged(name: string, _ov: string | null, nv: string | null): void {
    if (!this.input) return;
    if (name === 'value') {
      this.setValue(nv ?? '');
    }
    if (name === 'disabled') {
      this.input.disabled = this.hasAttribute('disabled');
    }
    if (name === 'placeholder') {
      this.input.setAttribute('placeholder', nv ?? '');
    }
  }

  private setValue(val: string): void {
    this._ignoreNextInput = true;
    this.setAttribute('value', val);
    const matching = this.options.find(o => o.value === val || o.label === val);
    if (matching && this.input) {
      this.input.value = matching.label;
    } else if (this.input) {
      this.input.value = val;
    }
    this._ignoreNextInput = false;
  }

  private readSlotOptions(): void {
    const optionEls = this.querySelectorAll('[data-option], option');
    if (optionEls.length > 0) {
      this.options = Array.from(optionEls).map(el => {
        if (el.hasAttribute('data-option')) {
          const label = (el as HTMLElement).dataset.option || el.textContent || '';
          const value = (el as HTMLElement).dataset.value || label;
          const disabled = el.hasAttribute('disabled');
          return { label, value, disabled };
        }
        const opt = el as HTMLOptionElement;
        return {
          label: el.textContent?.trim() || opt.value || '',
          value: opt.value || el.textContent?.trim() || '',
          disabled: opt.disabled,
        };
      });
    }
  }

  private build(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'wrapper';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('autocomplete', 'off');
    const placeholder = this.getAttribute('placeholder') || 'Select or search...';
    this.input.setAttribute('placeholder', placeholder);

    if (this.hasAttribute('disabled')) {
      this.input.disabled = true;
    }
    if (this.hasAttribute('required')) {
      this.input.setAttribute('aria-required', 'true');
    }

    const toggle = document.createElement('button');
    toggle.className = 'toggle';
    toggle.setAttribute('aria-label', 'Toggle options');
    toggle.setAttribute('type', 'button');
    toggle.textContent = '\u25BC';

    this.wrapper.appendChild(this.input);
    this.wrapper.appendChild(toggle);

    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.setAttribute('role', 'listbox');
    this.list = document.createElement('div');
    this.list.className = 'list';
    dropdown.appendChild(this.list);
    this.wrapper.appendChild(dropdown);

    this.innerHTML = '';
    this.appendChild(this.wrapper);

    this.input.addEventListener('input', this._onInput);
    this.input.addEventListener('keydown', this._onKey);
    toggle.addEventListener('click', this._onToggle);
    this.input.addEventListener('focus', this._onFocus);
    this.input.addEventListener('blur', this._onBlur);
    this.list.addEventListener('mousedown', this._onListMouseDown);

    this.render();

    const initialValue = this.getAttribute('value');
    if (initialValue) {
      this.setValue(initialValue);
    }
  }

  private toggle(): void { this.isOpen = !this.isOpen; this.render(); }

  private filter(): void { this.selected = -1; this.render(); }

  private _renderedAll = false;
  private _lastOptionCount = -1;

  private render(): void {
    if (!this.list) return;
    const q = this.input?.value?.toLowerCase() || '';
    const filtered = this.options.filter(o => o.label.toLowerCase().includes(q));
    this.wrapper.classList.toggle('open', this.isOpen);
    this.input?.setAttribute('aria-expanded', String(this.isOpen));

    const optionCountChanged = this.options.length !== this._lastOptionCount;
    if (!this._renderedAll || optionCountChanged) {
      this._lastOptionCount = this.options.length;
      this.list.innerHTML = '';
      for (let i = 0; i < this.options.length; i++) {
        const o = this.options[i];
        const div = document.createElement('div');
        div.className = 'option';
        div.setAttribute('role', 'option');
        div.dataset.value = o.value;
        div.dataset.index = String(i);
        div.textContent = o.label;
        if (o.disabled) div.classList.add('disabled');
        this.list.appendChild(div);
      }
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.setAttribute('role', 'option');
      empty.textContent = 'No results';
      this.list.appendChild(empty);
      this._renderedAll = true;
    }

    let visibleIdx = 0;
    for (const child of Array.from(this.list.children)) {
      if (child.classList.contains('empty')) {
        (child as HTMLElement).style.display = filtered.length > 0 ? 'none' : '';
        continue;
      }
      const idx = parseInt((child as HTMLElement).dataset.index || '-1', 10);
      const option = idx >= 0 ? this.options[idx] : null;
      if (option && option.label.toLowerCase().includes(q)) {
        (child as HTMLElement).style.display = '';
        child.setAttribute('aria-selected', String(visibleIdx === this.selected));
        child.classList.toggle('selected', visibleIdx === this.selected);
        visibleIdx++;
      } else {
        (child as HTMLElement).style.display = 'none';
        child.classList.remove('selected');
      }
    }
  }

  private onKey(e: KeyboardEvent): void {
    const q = this.input.value.toLowerCase();
    const filtered = this.options.filter(o => o.label.toLowerCase().includes(q));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.isOpen = true;
      this.selected = Math.min(this.selected + 1, filtered.length - 1);
      if (filtered[this.selected]?.disabled) {
        this.selected = Math.min(this.selected + 1, filtered.length - 1);
      }
      this.render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.isOpen = true;
      this.selected = Math.max(this.selected - 1, 0);
      if (filtered[this.selected]?.disabled) {
        this.selected = Math.max(this.selected - 1, 0);
      }
      this.render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.isOpen && this.selected >= 0 && this.selected < filtered.length) {
        this.select(this.selected);
      }
    } else if (e.key === 'Escape') {
      this.isOpen = false;
      this.render();
    }
  }

  private select(index: number): void {
    const q = this.input.value.toLowerCase();
    const filtered = this.options.filter(o => o.label.toLowerCase().includes(q));
    if (index < 0 || index >= filtered.length) return;
    const item = filtered[index];
    if (item.disabled) return;
    this.input.value = item.label;
    this.setAttribute('value', item.value);
    this.isOpen = false;
    this.render();
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true, composed: true,
      detail: { value: item.value, label: item.label },
    }));
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
