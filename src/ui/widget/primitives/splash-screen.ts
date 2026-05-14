import { UxBase } from './base.js';
import { registerLightStyle, registerStyles } from '../../style-registry.js';

const STYLE_ID = 'ux-splash-screen-style';
const STYLE_CSS = `
  ux-splash, ux-splash-screen {
    display: flex; align-items: center; justify-content: center;
    position: fixed; inset: 0; z-index: 9999;
    background: var(--color-bg, #fff);
    color: var(--color-text, #0f172a);
    font-size: 1.5rem; font-weight: 600;
    cursor: pointer; user-select: none;
    transition: opacity 300ms ease;
  }
  ux-splash[hidden], ux-splash-screen[hidden] {
    display: none;
  }
  ux-splash .splash-content, ux-splash-screen .splash-content {
    text-align: center; padding: 2rem;
  }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);
registerStyles({ 'ux-splash': 'splash-content', 'ux-splash-screen': 'splash-content', 'hidden': 'hidden' });

export class UxSplash extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'status');
    this.setAttribute('tabindex', '0');

    this.addEventListener('click', this.dismiss);
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.dismiss();
      }
    });

    document.addEventListener('ux:splash.show', this.show as EventListener);

    if (!this.querySelector('.splash-content')) {
      const content = document.createElement('div');
      content.className = 'splash-content';
      while (this.firstChild && this.firstChild !== content) {
        content.appendChild(this.firstChild);
      }
      this.appendChild(content);
    }
  }

  private show = (): void => {
    this.removeAttribute('hidden');
  };

  private dismiss = (): void => {
    this.setAttribute('hidden', '');
    this.dispatchEvent(new CustomEvent('ux:splash.event', {
      bubbles: true, composed: true,
      detail: { action: 'DISMISS' },
    }));
  };

  protected onDisconnected(): void {
    this.removeEventListener('click', this.dismiss);
    document.removeEventListener('ux:splash.show', this.show as EventListener);
    super.onDisconnected();
  }
}
