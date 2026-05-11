import { UxBase } from './base.js';

export class UxContextMenu extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'menu');
    this.style.display = 'none';
    this.addEventListener('click', this.onItemClick);
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onItemClick);
    super.onDisconnected();
  }

  show(x: number, y: number): void {
    this.style.display = 'block';
    this.style.position = 'fixed';
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
    this.style.zIndex = '10000';
    this.setAttribute('open', '');
  }

  hide(): void {
    this.style.display = 'none';
    this.removeAttribute('open');
  }

  private readonly onItemClick = (e: Event) => {
    const item = (e.target as HTMLElement).closest('ux-context-menu-item') as HTMLElement;
    if (!item) return;
    const action = item.getAttribute('data-action');
    if (action) {
      this.dispatchEvent(new CustomEvent('ux:context-action', {
        bubbles: true, composed: true,
        detail: { action, element: item },
      }));
    }
  };
}
