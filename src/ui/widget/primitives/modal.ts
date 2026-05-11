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
    this.setupCloseButton();
    if (this.hasAttribute('opened') && this.getAttribute('opened') !== 'false') {
      this.open();
    }
  }

  private render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
      <dialog part="dialog">
        <button class="close" part="close" aria-label="Close">&times;</button>
        <slot></slot>
      </dialog>`;
  }

  private setupCloseButton() {
    const btn = this.shadowRoot?.querySelector('.close');
    if (btn) this.listen(btn, 'click', () => this.close());
    if (this.dialog) {
      this.listen(this.dialog, 'close', () => {
        this.removeAttribute('opened');
        this.dispatch('CLOSE');
      });
    }
  }

  open() {
    if (!this.dialog) return;
    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
    this.setAttribute('opened', 'true');
    this.dispatch('OPEN');
  }

  close() {
    if (!this.dialog) return;
    if (typeof this.dialog.close === 'function') {
      this.dialog.close();
    } else {
      this.dialog.removeAttribute('open');
    }
    this.removeAttribute('opened');
    this.dispatch('CLOSE');
  }

  private dispatch(action: string) {
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true, detail: { action },
    }));
  }

  protected onAttributeChanged(name: string): void {
    if (name === 'opened') {
      const open = this.hasAttribute('opened') && this.getAttribute('opened') !== 'false';
      if (open) this.open(); else this.close();
    }
  }

  static get observedAttributes() {
    return ['opened'];
  }

  private styles() {
    return `
      dialog {
        padding: 0; border: none; border-radius: 0.75rem;
        max-width: 90vw; max-height: 85vh; width: 560px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        background: var(--color-bg, #fff); color: var(--color-text, #0f172a);
        overflow: visible;
      }
      dialog::backdrop {
        background: rgba(0,0,0,0.5);
      }
      .close {
        position: absolute; top: 0.75rem; right: 0.75rem;
        background: none; border: none; font-size: 1.25rem;
        cursor: pointer; color: var(--color-text-muted, #6b7280);
        width: 2rem; height: 2rem; border-radius: 0.25rem;
        display: flex; align-items: center; justify-content: center;
      }
      .close:hover { background: var(--color-bg-muted, #f3f4f6); }
      ::slotted(*) { display: block; }
    `;
  }
}

if (!customElements.get('ux-modal')) {
  customElements.define('ux-modal', UxModal);
}
