import { UxBase } from './base.js';

export class UxToggle extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    if (this.hasAttribute(stateAttr)) {
      this.applyAriaState(true);
    }
    this.addEventListener('click', this.onToggleActivate);
    this.addEventListener('keydown', this.onKeyDown);
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onToggleActivate);
    this.removeEventListener('keydown', this.onKeyDown);
  }

  private readonly onToggleActivate = (): void => {
    const stateAttr = this.getStateAttr();
    const next = !this.hasAttribute(stateAttr);
    this.toggleAttribute(stateAttr, next);
    this.applyAriaState(next);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { [stateAttr]: next },
    }));
    this.dispatchEvent(new CustomEvent(next ? 'ux:open' : 'ux:close', { bubbles: true }));
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggleActivate();
    }
  };

  protected getStateAttr(): string {
    return this.definition?.stateAttr ?? 'open';
  }

  protected applyAriaState(next: boolean): void {
    const role = this.getAttribute('role');
    if (role === 'switch' || role === 'checkbox') {
      this.setAttribute('aria-checked', String(next));
    } else {
      this.setAttribute('aria-expanded', String(next));
    }
  }
}
