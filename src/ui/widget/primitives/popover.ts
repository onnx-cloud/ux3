import { UxOverlay } from './ux-overlay.js';

export class UxPopover extends UxOverlay {
  private boundClickOutside: ((e: Event) => void) | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.boundClickOutside = (e: Event) => {
      if (!this.open) return;
      const target = e.target as HTMLElement;
      if (!this.contains(target)) {
        this.hide();
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
