import { UxOverlay } from './ux-overlay.js';

export class UxTooltip extends UxOverlay {
  private trigger: HTMLElement | null = null;
  private boundClickOutside: ((e: Event) => void) | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.trigger = this.querySelector('[ux-tooltip-trigger]') || this.previousElementSibling as HTMLElement;
    if (this.trigger) {
      this.trigger.addEventListener('mouseenter', () => this.show());
      this.trigger.addEventListener('mouseleave', () => this.hide());
      this.trigger.addEventListener('focus', () => this.show());
      this.trigger.addEventListener('blur', () => this.hide());
      this.trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (this.open) this.hide();
        else this.show();
      });
    }

    this.boundClickOutside = (e: Event) => {
      const target = e.target as Node;
      if (!this.open) return;
      if (this.contains(target) || (this.trigger && this.trigger.contains(target))) return;
      this.hide();
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
