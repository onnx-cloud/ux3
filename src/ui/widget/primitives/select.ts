import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-select-style';
const STYLE_CSS = `    ux-select { display: inline-block; }
    ux-select > option { display: none; }
    ux-select select {
      width: 100%; font: inherit; color: var(--color-text, #0f172a);
      background: var(--color-bg, #fff);
      border: 1px solid var(--color-border, #d1d5db);
      border-radius: 0.375rem; padding: 0.5rem 2rem 0.5rem 0.75rem;
      appearance: none; cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 0.75rem center;
    }
    ux-select select:focus { outline: none; border-color: var(--color-primary, #6b7280); box-shadow: 0 0 0 2px rgba(107,114,128,.2); }
    ux-select select:disabled { opacity: 0.5; cursor: not-allowed; }
    ux-select select.ux-invalid { border-color: #dc2626; }
    ux-select select.ux-invalid:focus { border-color: #dc2626; box-shadow: 0 0 0 2px rgba(220,38,38,.2); }
    ux-select[data-variant="compact"] select { padding: 0.375rem 1.75rem 0.375rem 0.625rem; font-size: 0.875rem; }
    ux-select[data-variant="filled"] select { background: #f3f4f6; border-color: transparent; }
    ux-select[data-variant="filled"] select:focus { background: #fff; border-color: var(--color-primary, #6b7280); }`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  selected?: boolean;
}

export class UxSelect extends UxBase {
  private selectEl: HTMLSelectElement | null = null;
  private observer: MutationObserver | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'name', 'disabled', 'required', 'placeholder'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
    this.observeOptions();
  }

  protected applyData(data: any): void {
    if (typeof data === 'string' || typeof data === 'number') {
      this.setAttribute('value', String(data));
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.options)) {
        this.observer?.disconnect();
        try {
          for (const existing of Array.from(this.querySelectorAll(':scope > option:not([data-placeholder])'))) {
            existing.remove();
          }
          for (const o of data.options) {
            if (typeof o === 'string') {
              const opt = document.createElement('option');
              opt.value = o;
              opt.textContent = o;
              this.appendChild(opt);
            } else {
              const opt = document.createElement('option');
              opt.value = o.value ?? o.label ?? '';
              opt.textContent = o.label ?? o.value ?? '';
              if (o.disabled) opt.disabled = true;
              if (o.selected) opt.selected = true;
              this.appendChild(opt);
            }
          }
          this.syncOptions();
        } finally {
          this.observeOptions();
        }
      }
      if ('value' in data) {
        this.setAttribute('value', String(data.value ?? ''));
      }
    }
    if (this.selectEl && this.getAttribute('value')) {
      const val = this.getAttribute('value')!;
      const exists = Array.from(this.selectEl.options).some(o => o.value === val);
      if (exists) this.selectEl.value = val;
    }
  }

  protected onDisconnected(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.selectEl) {
      this.selectEl.removeEventListener('change', this.onSelectChange);
    }
    super.onDisconnected();
  }

  protected onAttributeChanged(name: string, _ov: string | null, nv: string | null): void {
    if (name === 'value' && this.selectEl && this.selectEl.value !== nv) {
      this.selectEl.value = nv ?? '';
    }
    if (name === 'disabled' && this.selectEl) {
      this.selectEl.disabled = this.hasAttribute('disabled');
    }
    if (name === 'name' && this.selectEl) {
      this.selectEl.setAttribute('name', nv ?? '');
    }
    if (name === 'required' && this.selectEl) {
      if (this.hasAttribute('required')) {
        this.selectEl.setAttribute('required', '');
      } else {
        this.selectEl.removeAttribute('required');
      }
    }
  }

  private render(): void {
    const el = document.createElement('select');
    el.setAttribute('part', 'select');

    if (this.hasAttribute('name')) {
      el.setAttribute('name', this.getAttribute('name')!);
    }
    if (this.hasAttribute('required')) {
      el.setAttribute('required', '');
    }
    if (this.hasAttribute('disabled')) {
      el.disabled = true;
    }

    this.appendChild(el);
    this.selectEl = el;

    const placeholderText = this.getAttribute('placeholder');
    if (placeholderText) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = placeholderText;
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.setAttribute('data-placeholder', '');
      this.appendChild(placeholder);
    }

    this.syncOptions();
    const value = this.getAttribute('value') || '';
    if (value) this.selectEl.value = value;
    if (this.hasAttribute('disabled')) this.selectEl.disabled = true;

    this.selectEl.addEventListener('change', this.onSelectChange);
  }

  private syncOptions(): void {
    if (!this.selectEl) return;
    const options = Array.from(this.querySelectorAll(':scope > option')) as HTMLOptionElement[];

    const currentValue = this.selectEl.value;
    this.selectEl.innerHTML = '';

    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.textContent;
      if (opt.hasAttribute('selected') || opt.selected) o.selected = true;
      if (opt.disabled || opt.hasAttribute('data-placeholder')) o.disabled = true;
      this.selectEl!.appendChild(o);
    }

    if (currentValue) {
      const exists = Array.from(this.selectEl.options).some(o => o.value === currentValue);
      if (exists) this.selectEl.value = currentValue;
    }
  }

  private readonly onSelectChange = (): void => {
    if (!this.selectEl) return;
    const val = this.selectEl.value;
    this.setAttribute('value', val);
    this.selectEl.classList.remove('ux-invalid');
    this.dispatchEvent(new CustomEvent('ux:input.change', { bubbles: true, detail: { value: val } }));
  };

  private observeOptions(): void {
    this.observer = new MutationObserver(() => {
      this.syncOptions();
    });
    this.observer.observe(this, { childList: true, subtree: false, characterData: true });
  }
}
