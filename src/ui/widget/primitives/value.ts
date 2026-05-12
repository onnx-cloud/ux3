import { UxBase } from './base.js';

export class UxValue extends UxBase {
  static get observedAttributes(): string[] {
    return ['value'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.hasAttribute('value')) {
      this.setAttribute('value', '');
    }
    this.addEventListener('keydown', this.onKeyDown);
    this.syncA11yValue(this.getAttribute('value') ?? '');
  }

  protected onDisconnected(): void {
    this.removeEventListener('keydown', this.onKeyDown);
  }

  protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
    if (name !== 'value' || oldValue === newValue) {
      return;
    }
    const next = newValue ?? '';
    this.syncA11yValue(next);
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true,
      detail: { value: next },
    }));
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    const current = Number(this.getAttribute('value') || 0);
    if (!Number.isFinite(current)) {
      return;
    }
    const next = event.key === 'ArrowRight' ? current + 1 : current - 1;
    this.setAttribute('value', String(next));
    event.preventDefault();
  };

  protected syncA11yValue(value: string): void {
    const role = this.getAttribute('role');
    if (role === 'slider' || role === 'progressbar') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        this.setAttribute('aria-valuenow', String(numeric));
      }
    }
  }
}
