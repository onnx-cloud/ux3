import { UxToggle } from './toggle.js';

export class UxDrawer extends UxToggle {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this.removeAttribute('open');
        this.applyAriaState(false);
        this.dispatchEvent(new CustomEvent('ux:close', { bubbles: true }));
      }
    });
  }
}
