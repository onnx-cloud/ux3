/**
 * UX3 Toast / Notification Component
 *
 * Auto-dismissing toast notifications with stacking support and i18n
 *
 * Usage:
 * <ux-toast-container position="top-right"></ux-toast-container>
 *
 * Then emit toasts via:
 * const container = document.querySelector('ux-toast-container');
 * container.show({ message: 'Saved!', type: 'success', duration: 3000 });
 */

export interface ToastConfig {
  message: string;
  messageKey?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: { label: string; labelKey?: string; callback: () => void };
  onDismiss?: () => void;
}

export class UxToastContainer extends HTMLElement {
  private toasts: Map<string, UxToast> = new Map();
  private toastCounter = 0;

  connectedCallback() {
    this.setupContainer();
  }

  private setupContainer() {
    const position = this.getAttribute('position') || 'top-right';
    
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --toast-z-index: 9999;
        --toast-max-width: 400px;
      }

      .toast-stack {
        position: fixed;
        ${position.includes('top') ? 'top' : 'bottom'}: 1rem;
        ${position.includes('right') ? 'right' : 'left'}: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        z-index: var(--toast-z-index);
        max-width: var(--toast-max-width);
        pointer-events: none;
      }

      .toast-stack > * {
        pointer-events: auto;
      }
    `;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot?.appendChild(style);

    const stack = document.createElement('div');
    stack.className = 'toast-stack';
    this.shadowRoot?.appendChild(stack);
  }

  /**
   * Show a toast notification
   */
  show(config: ToastConfig): string {
    const id = `toast-${++this.toastCounter}`;
    const toast = new UxToast(id, config);
    
    const stack = this.shadowRoot?.querySelector('.toast-stack');
    if (stack) {
      stack.appendChild(toast);
    }

    this.toasts.set(id, toast);

    // Auto-dismiss after duration
    const duration = config.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.remove();
      this.toasts.delete(id);
    }
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.forEach(toast => toast.remove());
    this.toasts.clear();
  }
}

/**
 * Individual toast notification component
 */
class UxToast extends HTMLElement {
  private toastId: string;
  private config: ToastConfig;

  constructor(id: string, config: ToastConfig) {
    super();
    this.toastId = id;
    this.config = config;
    this.classList.add('toast');
    if (config.type) {
      this.classList.add(config.type);
    }
  }

  connectedCallback() {
    this.render();
    this.setupAccessibility();
  }

  private render() {
    const type = this.config.type || 'info';
    const message = this.config.messageKey 
      ? `{{i18n.toast.${this.config.messageKey}}}` 
      : this.config.message;

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        animation: slideIn 200ms ease-out;
      }
      :host(.toast) {
        display: block;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-radius: 0.375rem;
        background-color: white;
        border-left: 4px solid;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .toast.success {
        border-left-color: #10b981;
        background-color: #f0fdf4;
        color: #065f46;
      }

      .toast.error {
        border-left-color: #ef4444;
        background-color: #fef2f2;
        color: #7f1d1d;
      }

      .toast.warning {
        border-left-color: #f59e0b;
        background-color: #fffbeb;
        color: #78350f;
      }

      .toast.info {
        border-left-color: #3b82f6;
        background-color: #eff6ff;
        color: #1e3a8a;
      }

      .toast-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .toast-content {
        flex: 1;
      }

      .toast-action {
        flex-shrink: 0;
      }

      .toast-action button {
        background: none;
        border: none;
        color: currentColor;
        cursor: pointer;
        font-weight: 500;
        text-decoration: underline;
        padding: 0;
        font-size: inherit;
      }

      .toast-action button:hover {
        opacity: 0.8;
      }

      .toast-action button:focus {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .toast-dismiss {
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        opacity: 0.5;
        padding: 0;
        font-size: 1.25rem;
        transition: opacity 200ms;
      }

      .toast-dismiss:hover {
        opacity: 1;
      }

      .toast-dismiss:focus {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      :host(.dismissing) {
        animation: slideOut 200ms ease-out forwards;
      }
    `;

    const icon = this.getIcon(type);
    const html = `
      <div class="toast ${type}" role="alert">
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">${message}</div>
        ${this.config.action ? `
          <div class="toast-action">
            <button>${this.config.action.labelKey ? `{{i18n.toast.${this.config.action.labelKey}}}` : this.config.action.label}</button>
          </div>
        ` : ''}
        <button class="toast-dismiss" aria-label="Dismiss" title="Dismiss">✕</button>
      </div>
    `;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot?.appendChild(style);
    
    const toastEl = document.createElement('div');
    toastEl.innerHTML = html;
    this.shadowRoot?.appendChild(toastEl);

    // Setup event listeners
    const dismissBtn = this.shadowRoot?.querySelector('.toast-dismiss') as HTMLButtonElement;
    dismissBtn?.addEventListener('click', () => this.dismiss());

    if (this.config.action) {
      const actionBtn = this.shadowRoot?.querySelector('.toast-action button') as HTMLButtonElement;
      actionBtn?.addEventListener('click', () => {
        this.config.action?.callback();
        this.dismiss();
      });
    }
  }

  private getIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ⓘ';
    }
  }

  private setupAccessibility() {
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-atomic', 'true');
  }

  private dismiss() {
    this.classList.add('dismissing');
    setTimeout(() => {
      this.config.onDismiss?.();
      this.remove();
    }, 200);
  }
}

if (!customElements.get('ux-toast-container')) {
  customElements.define('ux-toast-container', UxToastContainer);
  customElements.define('ux-toast', UxToast);
}
