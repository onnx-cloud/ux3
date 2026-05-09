import { UxBase } from './base.js';

export class UxSlider extends UxBase {
  private range: HTMLInputElement | null = null;

  static get observedAttributes(): string[] {
    return ['value', 'min', 'max'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.hasAttribute('min')) this.setAttribute('min', '0');
    if (!this.hasAttribute('max')) this.setAttribute('max', '100');
    if (!this.hasAttribute('value')) this.setAttribute('value', this.getAttribute('min') || '0');
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(name: string, _old: string | null, newValue: string | null): void {
    if (!this.isConnected || !this.range) return;
    if (name === 'value') {
      this.range.value = newValue ?? this.getAttribute('min') ?? '0';
      this.setAttribute('aria-valuenow', this.range.value);
    } else if (name === 'min' || name === 'max') {
      this.render();
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const value = this.getAttribute('value') ?? '';
    const min = this.getAttribute('min') ?? '0';
    const max = this.getAttribute('max') ?? '100';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; }
        input[type=range] {
          width: 100%; height: 0.375rem; -webkit-appearance: none; appearance: none;
          background: var(--_s-bg, #e2e8f0); border-radius: 0.25rem; outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 1.125rem; height: 1.125rem; border-radius: 50%;
          background: var(--_s-thumb, #3b82f6); cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 1.125rem; height: 1.125rem; border-radius: 50%;
          background: var(--_s-thumb, #3b82f6); cursor: pointer; border: none;
        }
      </style>
      <input type="range" part="slider" min="${min}" max="${max}" value="${value}" />
    `;

    this.range = this.shadowRoot.querySelector('input');
    this.range?.addEventListener('input', (e) => {
      const v = (e.target as HTMLInputElement).value;
      this.setAttribute('value', v);
      this.setAttribute('aria-valuenow', v);
      this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { value: v } }));
    });

    this.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (this.range) {
          const min = Number(this.getAttribute('min') || 0);
          const max = Number(this.getAttribute('max') || 100);
          const delta = e.key === 'ArrowRight' ? 1 : -1;
          const next = Math.min(max, Math.max(min, Number(this.range.value || 0) + delta));
          this.range.value = String(next);
          this.setAttribute('value', String(next));
          this.setAttribute('aria-valuenow', String(next));
          this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { value: String(next) } }));
        }
        e.preventDefault();
      }
    });
  }

  protected onDisconnected(): void {
    if (this.range) {
      this.range.removeEventListener('input', () => {});
      this.range = null;
    }
    super.onDisconnected();
  }
}
