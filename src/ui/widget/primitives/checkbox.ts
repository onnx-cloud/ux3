import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-checkbox-style';
const STYLE_CSS = `
  ux-checkbox { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none; }
  ux-checkbox .cb-box {
    width: 1.125rem; height: 1.125rem; flex-shrink: 0;
    border: 2px solid var(--cb-border, #cbd5e1);
    border-radius: 0.25rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease;
  }
  ux-checkbox[checked] .cb-box {
    background: var(--cb-checked-bg, #3b82f6);
    border-color: var(--cb-checked-border, #3b82f6);
  }
  ux-checkbox[checked] .cb-box::after {
    content: '';
    width: 0.375rem; height: 0.5625rem;
    border: solid #fff;
    border-width: 0 0.125rem 0.125rem 0;
    transform: rotate(45deg) translateY(-0.0625rem);
  }
  ux-checkbox:focus-visible .cb-box {
    outline: 2px solid var(--cb-focus-ring, #93c5fd);
    outline-offset: 1px;
  }
  ux-checkbox[disabled] {
    opacity: 0.5; cursor: not-allowed; pointer-events: none;
  }
  ux-checkbox .cb-label {
    font-size: 0.875rem; color: var(--cb-label-color, #334155);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  ux-checkbox[data-variant="compact"] { gap: 0.25rem; }
  ux-checkbox[data-variant="compact"] .cb-box { width: 1rem; height: 1rem; }
  ux-checkbox[data-variant="compact"] .cb-label { font-size: 0.8125rem; }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxCheckbox extends UxBase {
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['checked', 'name', 'value', 'disabled', 'required'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'checkbox');
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
    this.addEventListener('click', this.onActivate);
    this.addEventListener('keydown', this.onKeyDown);
    this.tabIndex = 0;
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onActivate);
    this.removeEventListener('keydown', this.onKeyDown);
    super.onDisconnected();
  }

  protected applyData(data: any): void {
    if (typeof data === 'boolean') {
      this.toggleAttribute('checked', data);
    } else if (data && typeof data === 'object') {
      const checked = data.checked ?? data.value;
      if (typeof checked === 'boolean' || checked === 'true' || checked === '1') {
        this.setAttribute('checked', '');
      } else if (checked === false || checked === 'false' || checked === '0') {
        this.removeAttribute('checked');
      }
      if (data.label && this.querySelector('.cb-label')) {
        this.querySelector('.cb-label')!.textContent = String(data.label);
      }
    }
    this.updateAriaState();
  }

  protected onAttributeChanged(name: string, _ov: string | null, nv: string | null): void {
    if (name === 'checked') {
      this.updateVisual();
      this.updateAriaState();
    }
    if (name === 'disabled') {
      const disabled = nv !== null;
      this.tabIndex = disabled ? -1 : 0;
    }
  }

  private render(): void {
    const checked = this.hasAttribute('checked');
    const label = this.textContent?.trim() || '';
    const name = this.getAttribute('name') || '';

    const box = document.createElement('div');
    box.className = `cb-box${checked ? ' checked' : ''}`;

    const labelEl = document.createElement('span');
    labelEl.className = 'cb-label';
    labelEl.textContent = label;

    this.innerHTML = '';
    this.appendChild(box);
    this.appendChild(labelEl);

    this.updateAriaState();
  }

  private readonly onActivate = (): void => {
    const next = !this.hasAttribute('checked');
    if (next) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
    this.updateVisual();
    this.updateAriaState();
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true, composed: true,
      detail: { checked: next, value: this.getAttribute('value') || (next ? 'on' : '') },
    }));
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onActivate();
    }
  };

  private updateVisual(): void {
    const box = this.querySelector('.cb-box');
    if (box) {
      box.classList.toggle('checked', this.hasAttribute('checked'));
    }
  }

  private updateAriaState(): void {
    this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
  }
}
