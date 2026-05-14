import { UxBase } from './base.js';

export abstract class UxOverlay extends UxBase {
  private _open = false;
  private _backdropEl: HTMLElement | null = null;
  private _escapeBound = this._onEscape.bind(this);
  private _focusTrapBound = this._onFocusTrap.bind(this);

  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('click', this._onClickToggle);
    if (this.hasAttribute('open')) {
      queueMicrotask(() => this.show());
    }
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this._onClickToggle);
    this.hide();
    super.onDisconnected();
  }

  // ── Public API ───────────────────────────────────────────────────

  get open(): boolean {
    return this._open;
  }

  show(): void {
    if (this._open) return;
    this._open = true;
    this.setAttribute('open', '');
    this.setAttribute('aria-expanded', 'true');
    this.style.zIndex = '9999';
    this.addBackdrop();
    this.trapFocus();
    document.addEventListener('keydown', this._escapeBound);
    this.dispatchEvent(new CustomEvent('ux:overlay.open', {
      bubbles: true,
      composed: true,
      detail: { source: this.localName },
    }));
  }

  hide(): void {
    if (!this._open) return;
    this._open = false;
    this.removeAttribute('open');
    this.setAttribute('aria-expanded', 'false');
    this.style.zIndex = '';
    this.removeBackdrop();
    this.releaseFocus();
    document.removeEventListener('keydown', this._escapeBound);
    this.dispatchEvent(new CustomEvent('ux:overlay.close', {
      bubbles: true,
      composed: true,
      detail: { source: this.localName },
    }));
  }

  toggle(): void {
    if (this._open) this.hide();
    else this.show();
  }

  // ── Backdrop ─────────────────────────────────────────────────────

  protected addBackdrop(): void {
    if (this._backdropEl) return;
    const backdrop = document.createElement('div');
    backdrop.setAttribute('ux-overlay-backdrop', '');
    backdrop.style.cssText = `
      position:fixed;inset:0;z-index:9998;
      background:rgba(0,0,0,0.4);
    `;
    backdrop.addEventListener('click', () => this.hide());
    document.body.appendChild(backdrop);
    this._backdropEl = backdrop;
  }

  protected removeBackdrop(): void {
    this._backdropEl?.remove();
    this._backdropEl = null;
  }

  // ── Focus trap ───────────────────────────────────────────────────

  protected trapFocus(): void {
    this.addEventListener('focusout', this._focusTrapBound);
  }

  protected releaseFocus(): void {
    this.removeEventListener('focusout', this._focusTrapBound);
  }

  private _onFocusTrap(e: FocusEvent): void {
    if (!this.contains(e.relatedTarget as Node)) {
      this.focus();
    }
  }

  // ── Escape to dismiss ────────────────────────────────────────────

  private _onEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.hide();
    }
  }

  private readonly _onClickToggle = (e: MouseEvent): void => {
    if (e.target === this) this.toggle();
  };

  // ── Attribute observation ────────────────────────────────────────

  static get observedAttributes(): string[] {
    return ['open'];
  }

  protected onAttributeChanged(name: string, _old: string | null, _new: string | null): void {
    if (name === 'open') {
      if (this.hasAttribute('open')) this.show();
      else this.hide();
    }
  }
}
