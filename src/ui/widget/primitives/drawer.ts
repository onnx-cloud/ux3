import { UxToggle } from './toggle.js';

export class UxDrawer extends UxToggle {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this.removeAttribute('open');
        this.applyAriaState(false);
        this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, detail: { action: 'CLOSE' } }));
      }
    });

    if (this.hasAttribute('closable') && this.hasAttribute('open')) {
      this.addCloseButton();
    }
  }

  private addCloseButton(): void {
    const btn = document.createElement('button');
    btn.textContent = '\u00d7';
    btn.setAttribute('aria-label', 'Close');
    btn.style.cssText = 'position:absolute;top:0.5rem;right:0.5rem;background:none;border:none;font-size:1.25rem;cursor:pointer;color:inherit;opacity:0.6;';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeAttribute('open');
      this.applyAriaState(false);
      this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, detail: { action: 'CLOSE' } }));
    });
    this.style.position = this.style.position || 'relative';
    this.appendChild(btn);
  }
}
