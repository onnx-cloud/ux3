import { UxValue } from './value.js';

export class UxSlider extends UxValue {
  protected onConnected(): void {
    if (!this.hasAttribute('min')) {
      this.setAttribute('min', '0');
    }
    if (!this.hasAttribute('max')) {
      this.setAttribute('max', '100');
    }
    if (!this.hasAttribute('value')) {
      this.setAttribute('value', this.getAttribute('min') || '0');
    }
    super.onConnected();
  }

  protected syncA11yValue(value: string): void {
    super.syncA11yValue(value);
    this.setAttribute('aria-valuemin', this.getAttribute('min') || '0');
    this.setAttribute('aria-valuemax', this.getAttribute('max') || '100');
  }
}
