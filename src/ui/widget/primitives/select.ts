import { UxBase } from './base.js';

export class UxSelect extends UxBase {
  private selectEl: HTMLSelectElement | null = null;
  private observer: MutationObserver | null = null;

  static get observedAttributes(): string[] {
    return ['value', 'name', 'disabled'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
    this.observeOptions();
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
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        select { width: 100%; font: inherit; color: inherit; }
      </style>
      <select part="select"></select>`;
    this.selectEl = this.shadowRoot.querySelector('select');
    if (!this.selectEl) return;
    this.syncOptions();
    const value = this.getAttribute('value') || '';
    if (value) this.selectEl.value = value;
    if (this.hasAttribute('disabled')) this.selectEl.disabled = true;
    this.selectEl.addEventListener('change', this.onSelectChange);
  }

  private syncOptions(): void {
    if (!this.selectEl) return;
    const options = Array.from(this.querySelectorAll('option'));
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
