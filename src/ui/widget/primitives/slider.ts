import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-slider-style';
const STYLE_CSS = `    ux-slider { display: block; width: 100%; }
    ux-slider input[type=range] {
      width: 100%; height: 0.375rem; -webkit-appearance: none; appearance: none;
      background: var(--_s-bg, #e2e8f0); border-radius: 0.25rem; outline: none; cursor: pointer;
    }
    ux-slider input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 1.125rem; height: 1.125rem; border-radius: 50%;
      background: var(--_s-thumb, #3b82f6); cursor: pointer;
    }
    ux-slider input[type=range]::-moz-range-thumb {
      width: 1.125rem; height: 1.125rem; border-radius: 50%;
      background: var(--_s-thumb, #3b82f6); cursor: pointer; border: none;
    }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxSlider extends UxBase {
  private range: HTMLInputElement | null = null;
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'min', 'max'];
  }

  protected onConnected(): void {
    super.onConnected();
if (!this.hasAttribute('min')) this.setAttribute('min', '0');
    if (!this.hasAttribute('max')) this.setAttribute('max', '100');
    if (!this.hasAttribute('value')) this.setAttribute('value', this.getAttribute('min') || '0');
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
  }

  protected applyData(data: any): void {
    if (typeof data === 'number' || typeof data === 'string') {
      this.setAttribute('value', String(data));
    } else if (data && typeof data === 'object') {
      if ('value' in data) this.setAttribute('value', String(data.value));
      if ('min' in data) this.setAttribute('min', String(data.min));
      if ('max' in data) this.setAttribute('max', String(data.max));
    }
    if (this.range) {
      this.range.value = this.getAttribute('value') ?? '0';
      this.setAttribute('aria-valuenow', this.range.value);
    }
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
    if (this.range) {
      const min = this.getAttribute('min') ?? '0';
      const max = this.getAttribute('max') ?? '100';
      this.range.min = min;
      this.range.max = max;
      this.range.value = this.getAttribute('value') ?? min;
      return;
    }

    const value = this.getAttribute('value') ?? '';
    const min = this.getAttribute('min') ?? '0';
    const max = this.getAttribute('max') ?? '100';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.value = value;
    input.setAttribute('part', 'slider');
    input.addEventListener('input', (e) => {
      const v = (e.target as HTMLInputElement).value;
      this.setAttribute('value', v);
      this.setAttribute('aria-valuenow', v);
      this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { value: v } }));
    });

    this.appendChild(input);
    this.range = input;

    this.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (this.range) {
          const minVal = Number(this.getAttribute('min') || 0);
          const maxVal = Number(this.getAttribute('max') || 100);
          const delta = e.key === 'ArrowRight' ? 1 : -1;
          const next = Math.min(maxVal, Math.max(minVal, Number(this.range.value || 0) + delta));
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
    this.range = null;
    super.onDisconnected();
  }
}
