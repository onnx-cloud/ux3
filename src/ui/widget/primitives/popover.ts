import { UxToggle } from './toggle.js';

export class UxPopover extends UxToggle {
  private boundClickOutside: ((e: Event) => void) | null = null;

  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    this.boundClickOutside = (e: Event) => {
      if (!this.hasAttribute(stateAttr)) return;
      const target = e.target as HTMLElement;
      if (!this.contains(target)) {
        this.removeAttribute(stateAttr);
        this.applyAriaState(false);
        this.dispatchEvent(new CustomEvent('ux:close', { bubbles: true }));
      }
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
