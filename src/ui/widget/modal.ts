/**
 * UX3 Modal / Dialog Web Component
 *
 * FSM-driven modal dialog with keyboard support, focus trapping, and accessibility
 *
 * Usage:
 * <ux-modal ux-fsm="confirmDelete" ux-view="deleteConfirm" opened="false">
 *   <div slot="header">
 *     <h2>Confirm Delete</h2>
 *   </div>
 *   <div slot="body">
 *     <p>Are you sure you want to delete this item?</p>
 *   </div>
 *   <div slot="footer">
 *     <ux-button variant="secondary" ux-event="click:CANCEL">Cancel</ux-button>
 *     <ux-button variant="danger" ux-event="click:CONFIRM">Delete</ux-button>
 *   </div>
 * </ux-modal>
 */

export class UxModal extends HTMLElement {
  private backdrop: HTMLDivElement | null = null;
  private dialog: HTMLDialogElement | null = null;
  private focusTrap: FocusTrap | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initializeModal();
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="modal-backdrop"></div>
      <dialog class="modal-dialog" role="dialog" aria-modal="true">
        <div class="modal-content">
          <div class="modal-header">
            <slot name="header">
              <h2>Dialog</h2>
            </slot>
            <button class="modal-close-btn" type="button" aria-label="Close">✕</button>
          </div>
          <div class="modal-body">
            <slot name="body"></slot>
          </div>
          <div class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </dialog>
    `;
  }

  private initializeModal() {
    const dialog = this.shadowRoot?.querySelector('dialog');
    if (dialog) {
      this.dialog = dialog;
      this.setupBackdrop();
      this.setupKeyboardHandling();
      this.setupCloseButton();
      this.setupFocusTrap();
      this.syncOpenedAttribute();
    }
  }

  /**
   * Sync 'opened' attribute with dialog open state
   */
  private syncOpenedAttribute() {
    const isOpened = this.hasAttribute('opened') && this.getAttribute('opened') !== 'false';
    
    if (isOpened && this.dialog && !this.dialog.open) {
      this.openModal();
    } else if (!isOpened && this.dialog && this.dialog.open) {
      this.closeModal();
    }
  }

  /**
   * Open modal dialog
   */
  openModal() {
    if (!this.dialog) return;

    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }

    this.setAttribute('opened', 'true');
    this.backdrop?.classList.add('visible');
    this.focusTrap?.trapFocus();

    this.dispatchEvent(new CustomEvent('modal-open', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Close modal dialog
   */
  closeModal() {
    if (!this.dialog) return;

    if (typeof this.dialog.close === 'function') {
      this.dialog.close();
    } else {
      this.dialog.removeAttribute('open');
    }

    this.setAttribute('opened', 'false');
    this.backdrop?.classList.remove('visible');
    this.focusTrap?.releaseFocus();

    this.dispatchEvent(new CustomEvent('modal-close', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Setup backdrop click to close
   */
  private setupBackdrop() {
    if (!this.shadowRoot) return;
    
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop') as HTMLDivElement;
    if (backdrop) {
      this.backdrop = backdrop;
      const closeOnBackdrop = this.getAttribute('close-on-backdrop') !== 'false';
      
      if (closeOnBackdrop) {
        backdrop.addEventListener('click', () => {
          this.closeModal();
        });
      }
    }
  }

  private setupCloseButton() {
    const closeBtn = this.shadowRoot?.querySelector('.modal-close-btn') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
  }

  /**
   * Setup keyboard handling (Escape to close)
   */
  private setupKeyboardHandling() {
    if (!this.dialog) return;

    this.dialog.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeModal();
      }
    });
  }

  /**
   * Setup focus trap (Tab cycling within modal)
   */
  private setupFocusTrap() {
    if (!this.dialog) return;
    
    this.focusTrap = new FocusTrap(this.dialog);
  }

  protected getStyles(): string {
    return `
      :host {
        --modal-max-width: 600px;
        --modal-z-index: 1000;
        --backdrop-opacity: 0.5;
      }

      dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: var(--modal-max-width);
        width: 90%;
        max-height: 90vh;
        padding: 0;
        border: none;
        border-radius: 0.5rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: var(--modal-z-index);
        animation: slideIn 200ms ease-out;
        overflow-y: auto;
      }

      dialog::backdrop {
        background-color: rgba(0, 0, 0, var(--backdrop-opacity));
        animation: fadeIn 200ms ease-out;
      }

      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, var(--backdrop-opacity));
        z-index: calc(var(--modal-z-index) - 1);
        opacity: 0;
        visibility: hidden;
        transition: opacity 200ms ease-out, visibility 200ms ease-out;
      }

      .modal-backdrop.visible {
        opacity: 1;
        visibility: visible;
      }

      .modal-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: white;
        border-radius: 0.5rem;
      }

      .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
      }

      .modal-close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
        transition: background-color 200ms;
      }

      .modal-close-btn:hover {
        background-color: #f3f4f6;
        color: #1f2937;
      }

      .modal-close-btn:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .modal-body {
        padding: 1.5rem;
        flex: 1;
        overflow-y: auto;
        color: #374151;
        line-height: 1.6;
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -45%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }

      @media (max-width: 640px) {
        dialog {
          width: 95%;
          max-height: 95vh;
        }

        .modal-header,
        .modal-body,
        .modal-footer {
          padding: 1rem;
        }

        .modal-footer {
          flex-direction: column;
        }
      }
    `;
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    const base = HTMLElement.prototype as any;
    if (typeof base.attributeChangedCallback === 'function') {
      base.attributeChangedCallback.call(this, name, oldVal, newVal);
    }

    if (name === 'opened') {
      this.syncOpenedAttribute();
    }
  }

  static get observedAttributes() {
    return ['opened', 'close-on-backdrop'];
  }
}

/**
 * Focus trap implementation for modal dialogs
 * Prevents Tab key from leaving the modal
 */
class FocusTrap {
  private element: HTMLElement;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  /**
   * Get all focusable elements
   */
  private getFocusableElements(): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'ux-button',
      'ux-field'
    ];

    const selector = focusableSelectors.join(',');
    return Array.from(this.element.querySelectorAll(selector));
  }

  /**
   * Trap focus within modal
   */
  trapFocus() {
    // Store current focus
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    
    // Set focus to first focusable element
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Add Tab key handler
    this.element.addEventListener('keydown', this.handleTabKey.bind(this));
  }

  /**
   * Release focus trap
   */
  releaseFocus() {
    // Restore previous focus
    if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
      this.previouslyFocusedElement.focus();
    }
    
    // Remove Tab key handler
    this.element.removeEventListener('keydown', this.handleTabKey.bind(this));
  }

  /**
   * Handle Tab key navigation
   */
  private handleTabKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentFocus = document.activeElement;
    const currentIndex = focusableElements.indexOf(currentFocus as HTMLElement);

    if (e.shiftKey) {
      // Shift+Tab: move to previous
      if (currentIndex === 0) {
        e.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
    } else {
      // Tab: move to next
      if (currentIndex === focusableElements.length - 1) {
        e.preventDefault();
        focusableElements[0].focus();
      }
    }
  }
}

if (!customElements.get('ux-modal')) {
  customElements.define('ux-modal', UxModal);
}
