import { UxBase } from './base.js';

export class UxRadioGroup extends UxBase {
  static get observedAttributes(): string[] {
    return ['value'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'radiogroup');
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const label = this.textContent?.trim() || this.getAttribute('label') || '';
    const currentValue = this.getAttribute('value') || label;
    const options = this.parseOptions();

    const radios = options.length > 0 ? options.map((opt, i) => {
      const checked = opt === currentValue ? 'checked' : '';
      return `<label class="option"><input type="radio" name="rg" value="${opt}" ${checked} tabindex="0" /><span>${opt}</span></label>`;
    }).join('') : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
        .option { display: inline-flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.875rem; color: var(--_rg-label, #334155); user-select: none; }
        .option input[type=radio] { accent-color: var(--_rg-accent, #3b82f6); margin: 0; width: 1rem; height: 1rem; cursor: pointer; }
      </style>
      ${radios}
    `;
  }

  private parseOptions(): string[] {
    const attr = this.getAttribute('options');
    if (attr) return attr.split(',').map(s => s.trim()).filter(Boolean);
    const label = this.textContent?.trim();
    if (label) return [label];
    return [];
  }

  private readonly onClick = (e: Event) => {
    const radio = (e.target as HTMLElement).closest('input[type=radio]') as HTMLInputElement | null;
    if (!radio) return;
    const val = radio.value;
    this.setAttribute('value', val);
    this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { value: val } }));
  };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') e.preventDefault();
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') e.preventDefault();
  };
}
