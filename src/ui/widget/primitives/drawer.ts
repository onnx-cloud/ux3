import { UxToggle } from './toggle.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-drawer-style';
const STYLE_CSS = `
  ux-drawer {
    background: var(--color-bg, #fff);
    color: var(--color-text, #0f172a);
    overflow: auto;
    position: fixed;
    inset: 0;
    transform: translateX(100%);
    opacity: 0;
    visibility: hidden;
    transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
    will-change: transform, opacity;
  }

  ux-drawer[open] {
    opacity: 1;
    visibility: visible;
  }

  ux-drawer.drawer-right {
    top: 0;
    right: 0;
    bottom: 0;
    width: min(100%, 20rem);
    transform: translateX(100%);
    touch-action: pan-y;
  }

  ux-drawer.drawer-left {
    top: 0;
    left: 0;
    bottom: 0;
    width: min(100%, 20rem);
    transform: translateX(-100%);
    touch-action: pan-y;
  }

  ux-drawer.drawer-top {
    left: 0;
    right: 0;
    top: 0;
    height: min(100%, 20rem);
    transform: translateY(-100%);
    touch-action: pan-x;
  }

  ux-drawer.drawer-bottom {
    left: 0;
    right: 0;
    bottom: 0;
    height: min(100%, 20rem);
    transform: translateY(100%);
    touch-action: pan-x;
  }

  ux-drawer.drawer-right[open],
  ux-drawer.drawer-left[open],
  ux-drawer.drawer-top[open],
  ux-drawer.drawer-bottom[open] {
    transform: translate(0, 0);
  }

  ux-drawer .close-button {
    appearance: none;
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--color-text-muted, #6b7280);
    font-size: 1.25rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 180ms ease, color 180ms ease;
  }

  ux-drawer .close-button:hover,
  ux-drawer .close-button:focus-visible {
    background: var(--color-bg-muted, #f1f5f9);
    color: var(--color-text, #0f172a);
  }

  ux-drawer .close-button:focus-visible {
    outline: 2px solid var(--color-primary, #3b82f6);
    outline-offset: 2px;
  }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxDrawer extends UxToggle {
  private closeButton: HTMLButtonElement | null = null;
  private swipePointerId: number | null = null;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeEdgeGesture = false;

  protected onConnected(): void {
    super.onConnected();
    this.updatePositionClasses();
    this.updateClosableButton();
    this.listen(this, 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.hasAttribute('open')) {
        this.closeDrawer();
      }
    });

    if (typeof window !== 'undefined') {
      this.listen(window, 'pointerdown', this.onPointerDown, { passive: true });
      this.listen(window, 'pointerup', this.onPointerUp);
      this.listen(window, 'pointercancel', this.onPointerCancel);
    }
  }

  protected onAttributeChanged(name: string): void {
    if (name === 'position') {
      this.updatePositionClasses();
    }
    if (name === 'closable') {
      this.updateClosableButton();
    }
  }

  private get position(): 'left' | 'right' | 'top' | 'bottom' {
    const value = this.getAttribute('position');
    if (value === 'left' || value === 'top' || value === 'bottom') {
      return value;
    }
    return 'right';
  }

  private get closable(): boolean {
    return this.hasAttribute('closable');
  }

  private updatePositionClasses(): void {
    this.classList.remove('drawer-left', 'drawer-right', 'drawer-top', 'drawer-bottom');
    this.classList.add(`drawer-${this.position}`);
  }

  private updateClosableButton(): void {
    if (!this.closable) {
      if (this.closeButton) {
        this.closeButton.remove();
        this.closeButton = null;
      }
      return;
    }

    if (this.closeButton) {
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'close-button';
    btn.textContent = '\u00d7';
    btn.setAttribute('aria-label', 'Close');
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.closeDrawer();
    });

    this.closeButton = btn;
    this.appendChild(btn);
  }

  private get edgeThreshold(): number {
    return 32;
  }

  private get swipeThreshold(): number {
    return 64;
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary || this.swipePointerId !== null) {
      return;
    }

    const path = event.composedPath ? event.composedPath() : [];
    const insideDrawer = path.includes(this);
    const open = this.hasAttribute('open');
    const position = this.position;
    const x = event.clientX;
    const y = event.clientY;
    const edgeOpen = !open && (
      (position === 'right' && x >= window.innerWidth - this.edgeThreshold) ||
      (position === 'left' && x <= this.edgeThreshold) ||
      (position === 'top' && y <= this.edgeThreshold) ||
      (position === 'bottom' && y >= window.innerHeight - this.edgeThreshold)
    );

    if (!open && !edgeOpen) {
      return;
    }

    if (open && !insideDrawer) {
      return;
    }

    this.swipePointerId = event.pointerId;
    this.swipeStartX = x;
    this.swipeStartY = y;
    this.swipeEdgeGesture = edgeOpen;
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.swipePointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.swipeStartX;
    const deltaY = event.clientY - this.swipeStartY;
    const position = this.position;
    const open = this.hasAttribute('open');

    const shouldClose = open && (
      (position === 'right' && deltaX < -this.swipeThreshold) ||
      (position === 'left' && deltaX > this.swipeThreshold) ||
      (position === 'top' && deltaY > this.swipeThreshold) ||
      (position === 'bottom' && deltaY < -this.swipeThreshold)
    );

    const shouldOpen = this.swipeEdgeGesture && !open && (
      (position === 'right' && deltaX < -this.swipeThreshold) ||
      (position === 'left' && deltaX > this.swipeThreshold) ||
      (position === 'top' && deltaY > this.swipeThreshold) ||
      (position === 'bottom' && deltaY < -this.swipeThreshold)
    );

    if (shouldClose) {
      this.closeDrawer();
    } else if (shouldOpen) {
      this.openDrawer();
    }

    this.resetSwipeState();
  };

  private onPointerCancel = (event: PointerEvent): void => {
    if (this.swipePointerId !== event.pointerId) {
      return;
    }
    this.resetSwipeState();
  };

  private resetSwipeState(): void {
    this.swipePointerId = null;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.swipeEdgeGesture = false;
  }

  private openDrawer(): void {
    if (this.hasAttribute('open')) {
      return;
    }
    this.setAttribute('open', '');
    this.applyAriaState(true);
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, detail: { action: 'OPEN' } }));
  }

  private closeDrawer(): void {
    if (!this.hasAttribute('open')) {
      return;
    }
    this.removeAttribute('open');
    this.applyAriaState(false);
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, detail: { action: 'CLOSE' } }));
  }

  static get observedAttributes(): string[] {
    return [...UxToggle.observedAttributes, 'closable', 'position'];
  }
}
