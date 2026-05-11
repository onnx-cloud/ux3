import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-select-style';
const STYLE_CSS = `    ux-select { display: inline-block; }
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
    ux-select select:disabled { opacity: 0.5; cursor: not-allowed; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxSelect extends UxBase {
  private selectEl: HTMLSelectElement | null = null;
  private observer: MutationObserver | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'name', 'disabled'];
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
      if ('value' in data) this.setAttribute('value', String(data.value ?? ''));
      if (Array.isArray(data.options)) {
        const fragment = document.createDocumentFragment();
        for (const o of data.options) {
          if (typeof o === 'string') {
            const opt = document.createElement('option');
            opt.value = o;
            opt.textContent = o;
            fragment.appendChild(opt);
          } else {
            const opt = document.createElement('option');
            opt.value = o.value ?? o.label ?? '';
            opt.textContent = o.label ?? o.value ?? '';
            fragment.appendChild(opt);
          }
        }
        this.innerHTML = '';
        this.appendChild(fragment);
        this.syncOptions();
      }
    }
    if (this.selectEl && this.getAttribute('value')) {
      this.selectEl.value = this.getAttribute('value')!;
    }
  }

  protected onDisconnected(): void {
    this.observer?.disconnect();
    this.observer = null;
    super.onDisconnected();
  }

  protected onAttributeChanged(name: string, _ov: string | null, nv: string | null): void {
    if (name === 'value' && this.selectEl && this.selectEl.value !== nv) {
      this.selectEl.value = nv ?? '';
    }
    if (name === 'disabled' && this.selectEl) {
      this.selectEl.disabled = this.hasAttribute('disabled');
    }
  }

  private render(): void {
    const el = document.createElement('select');
    el.setAttribute('part', 'select');
    this.appendChild(el);
    this.selectEl = el;

    this.syncOptions();
    const value = this.getAttribute('value') || '';
    if (value) this.selectEl.value = value;
    if (this.hasAttribute('disabled')) this.selectEl.disabled = true;
    this.selectEl.addEventListener('change', this.onSelectChange);
  }

  private syncOptions(): void {
    if (!this.selectEl) return;
    const options = Array.from(this.querySelectorAll(':scope > option')) as HTMLOptionElement[];
    this.selectEl.innerHTML = '';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.textContent;
      if (opt.hasAttribute('selected')) o.selected = true;
      this.selectEl!.appendChild(o);
    });
  }

  private readonly onSelectChange = (): void => {
    if (!this.selectEl) return;
    const val = this.selectEl.value;
    this.setAttribute('value', val);
    this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { value: val } }));
  };

  private observeOptions(): void {
    this.observer = new MutationObserver(() => {
      this.syncOptions();
    });
    this.observer.observe(this, { childList: true, subtree: true, characterData: true });
  }
}
