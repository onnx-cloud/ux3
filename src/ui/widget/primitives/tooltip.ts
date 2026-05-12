import { UxToggle } from './toggle.js';

export class UxTooltip extends UxToggle {
  private trigger: HTMLElement | null = null;
  private boundClickOutside: ((e: Event) => void) | null = null;

  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    this.trigger = this.querySelector('[ux-tooltip-trigger]') || this.previousElementSibling as HTMLElement;
    if (this.trigger) {
      this.trigger.addEventListener('mouseenter', () => this.setAttribute(stateAttr, ''));
      this.trigger.addEventListener('mouseleave', () => this.removeAttribute(stateAttr));
      this.trigger.addEventListener('focus', () => this.setAttribute(stateAttr, ''));
      this.trigger.addEventListener('blur', () => this.removeAttribute(stateAttr));
      this.trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopPropagation();
        const isOpen = this.hasAttribute(stateAttr);
        if (isOpen) {
          this.removeAttribute(stateAttr);
        } else {
          this.setAttribute(stateAttr, '');
        }
      });
    }

    this.boundClickOutside = (e: Event) => {
      const target = e.target as Node;
      if (!this.hasAttribute(stateAttr)) return;
      if (this.contains(target) || (this.trigger && this.trigger.contains(target))) return;
      this.removeAttribute(stateAttr);
    };
    document.addEventListener('click', this.boundClickOutside);
  }

  protected onDisconnected(): void {
    if (this.boundClickOutside) {
      document.removeEventListener('click', this.boundClickOutside);
    }
    super.onDisconnected();
  }
}
