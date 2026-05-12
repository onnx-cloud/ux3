import { LifecycleComponent } from '../../lifecycle-component.js';

export class UxModal extends LifecycleComponent {
  private dialog: HTMLDialogElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  protected onConnected(): void {
    this.render();
    this.dialog = this.shadowRoot!.querySelector('dialog');
    this.setupCloseButtons();
    if (this.dialog) {
      this.listen(this.dialog, 'close', () => {
        this.removeAttribute('opened');
        this.emit('CLOSE');
      });
      this.listen(this.dialog, 'click', this.onDialogClick);
    }
    if (this.hasAttribute('opened') && this.getAttribute('opened') !== 'false') {
      this.open();
    }
  }

  private render() {
    if (!this.shadowRoot) return;
    const hasNamed = this.querySelector('[slot]');
    const content = hasNamed
      ? `<div class="header"><slot name="header"></slot></div>
         <div class="body"><slot name="body"></slot></div>
         <div class="footer"><slot name="footer"></slot></div>`
      : `<slot></slot>`;
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
      <dialog part="dialog">
        <button class="close" part="close" aria-label="Close">&times;</button>
        ${content}
      </dialog>`;
  }

  private setupCloseButtons() {
    const btn = this.shadowRoot?.querySelector('.close');
    if (btn) this.listen(btn, 'click', () => this.close());
  }

  // backward-compatible aliases
  openModal() { this.open(); }
  closeModal() { this.close(); }

  private onDialogClick = (event: MouseEvent): void => {
    if (event.target === this.dialog) {
      this.close();
    }
  };

  open() {
    if (!this.dialog) return;
    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
    this.setAttribute('opened', 'true');
    this.emit('OPEN');
  }

  close() {
    if (!this.dialog) return;
    if (typeof this.dialog.close === 'function') {
      this.dialog.close();
    } else {
      this.dialog.removeAttribute('open');
    }
    this.removeAttribute('opened');
    this.emit('CLOSE');
  }

  private emit(action: string) {
    this.dispatchEvent(new CustomEvent('ux:widget.modal.event', {
      bubbles: true, composed: true, detail: { action },
    }));
  }

  protected onAttributeChanged(name: string): void {
    if (name === 'opened') {
      const open = this.hasAttribute('opened') && this.getAttribute('opened') !== 'false';
      open ? this.open() : this.close();
    }
  }

  static get observedAttributes() {
    return ['opened'];
  }

  private styles() {
    return `
      dialog {
        padding: 0; border: none; border-radius: 0.75rem;
        width: min(92vw, 560px); max-width: 92vw; max-height: 90vh;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        background: var(--color-bg, #fff);
        color: var(--color-text, #0f172a);
        overflow: hidden;
      }
      dialog::backdrop { background: rgba(0,0,0,0.45); }
      .close {
        position: absolute; top: 0.75rem; right: 0.75rem; z-index: 1;
        background: none; border: none; font-size: 1.25rem;
        cursor: pointer; color: var(--color-text-muted, #6b7280);
        width: 2rem; height: 2rem; border-radius: 0.25rem;
        display: flex; align-items: center; justify-content: center;
      }
      .close:hover { background: var(--color-bg-muted, #f3f4f6); color: var(--color-text, #0f172a); }
      .header { padding: 1.25rem 1.5rem 0.75rem; border-bottom: 1px solid var(--color-border, #e2e8f0); }
      .body { padding: 1.25rem 1.5rem; flex: 1; overflow-y: auto; }
      .footer { padding: 0.75rem 1.5rem 1.25rem; border-top: 1px solid var(--color-border, #e2e8f0); display: flex; gap: 0.75rem; justify-content: flex-end; }
      ::slotted(h3), ::slotted(h2) { margin: 0; font-size: 1.125rem; font-weight: 600; }
      .header ::slotted(*) { margin: 0; }
    `;
  }
}

if (!customElements.get('ux-modal')) {
  customElements.define('ux-modal', UxModal);
}
