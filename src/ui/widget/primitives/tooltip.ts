import { UxToggle } from './toggle.js';

export class UxTooltip extends UxToggle {
  private trigger: HTMLElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    this.trigger = this.querySelector('[ux-tooltip-trigger]') || this.previousElementSibling as HTMLElement;
    if (this.trigger) {
      this.trigger.addEventListener('mouseenter', () => this.setAttribute(stateAttr, ''));
      this.trigger.addEventListener('mouseleave', () => this.removeAttribute(stateAttr));
      this.trigger.addEventListener('focus', () => this.setAttribute(stateAttr, ''));
      this.trigger.addEventListener('blur', () => this.removeAttribute(stateAttr));
    }
  }
}
