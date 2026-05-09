import { UxBase } from './base.js';

export class UxSplash extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'status');
    this.addEventListener('click', () => {
      this.style.display = 'none';
      this.dispatchEvent(new CustomEvent('ux:event', {
        bubbles: true, composed: true,
        detail: { action: 'DISMISS' },
      }));
    });
    this.setAttribute('tabindex', '0');
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.style.display = 'none';
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'DISMISS' },
        }));
      }
    });
  }
}
