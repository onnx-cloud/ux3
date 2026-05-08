import { UxBase } from './base.js';

export class UxMenu extends UxBase {
  private items: HTMLElement[] = [];
  private currentIdx = -1;

  static get observedAttributes(): string[] {
    return ['value'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'menu');
    this.collectItems();
    this.addEventListener('click', this.onItemClick);
    this.addEventListener('keydown', this.onMenuKeyDown);
    this.addEventListener('mouseover', this.onItemHover);
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onItemClick);
    this.removeEventListener('keydown', this.onMenuKeyDown);
    this.removeEventListener('mouseover', this.onItemHover);
    super.onDisconnected();
  }

  private collectItems() {
    this.items = Array.from(this.querySelectorAll('ux-menu-item, [role="menuitem"], [ux-role="menuitem"]'));
    const selected = this.items.findIndex(item =>
      item.hasAttribute('selected') || item.getAttribute('aria-selected') === 'true');
    if (selected >= 0) {
      this.currentIdx = selected;
    }
  }

  private readonly onItemClick = (e: Event) => {
    const item = (e.target as HTMLElement).closest('ux-menu-item, [role="menuitem"]') as HTMLElement;
    if (!item) return;
    const idx = this.items.indexOf(item);
    if (idx >= 0) this.selectItem(idx);
  };

  private readonly onItemHover = (e: Event) => {
    const item = (e.target as HTMLElement).closest('ux-menu-item, [role="menuitem"]') as HTMLElement;
    if (!item) return;
    const idx = this.items.indexOf(item);
    if (idx >= 0) this.focusItem(idx);
  };

  private readonly onMenuKeyDown = (e: KeyboardEvent) => {
    if (this.items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusItem((this.currentIdx + 1) % this.items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusItem((this.currentIdx - 1 + this.items.length) % this.items.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.focusItem(this.items.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.currentIdx >= 0) this.selectItem(this.currentIdx);
    }
  };

  private focusItem(index: number) {
    this.items[this.currentIdx]?.setAttribute('tabindex', '-1');
    this.currentIdx = index;
    const item = this.items[index];
    if (item) {
      item.setAttribute('tabindex', '0');
      item.focus();
    }
  }

  private selectItem(index: number) {
    this.items.forEach((item, i) => {
      if (i === index) {
        item.setAttribute('aria-selected', 'true');
        item.setAttribute('selected', '');
      } else {
        item.removeAttribute('aria-selected');
        item.removeAttribute('selected');
      }
    });
    const value = this.items[index]?.getAttribute('value') || this.items[index]?.textContent?.trim() || '';
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { value, selectedIndex: index },
    }));
  }
}
