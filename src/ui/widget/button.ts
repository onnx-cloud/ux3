/**
 * UX3 Button Web Component (light DOM)
 *
 * Autonomous custom element used as:
 * <ux-button variant="primary">Save</ux-button>
 *
 * Light DOM — no shadow root. The native <button> is a direct child.
 * This allows CSS inheritance, FormData participation, and native
 * form submission interception without dispatchEvent workarounds.
 */
import { LifecycleComponent } from '../lifecycle-component.js';

const STYLE_ID = 'ux-button-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ux-button {
      display: inline-block;
    }
    ux-button button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: inherit;
      font-weight: 500;
      border-radius: 0.375rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 200ms ease;
      white-space: nowrap;
      user-select: none;
    }
    ux-button[size="sm"] button {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }
    ux-button[size="md"] button,
    ux-button:not([size]) button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
    }
    ux-button[size="lg"] button {
      padding: 0.75rem 1.5rem;
      font-size: 1.125rem;
    }
    ux-button[variant="primary"] button,
    ux-button:not([variant]) button {
      background-color: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    ux-button[variant="secondary"] button {
      background-color: #e5e7eb;
      color: #1f2937;
      border-color: #d1d5db;
    }
    ux-button[variant="danger"] button {
      background-color: #ef4444;
      color: white;
      border-color: #ef4444;
    }
    ux-button[variant="success"] button {
      background-color: #10b981;
      color: white;
      border-color: #10b981;
    }
    ux-button[variant="warning"] button {
      background-color: #f59e0b;
      color: white;
      border-color: #f59e0b;
    }
    ux-button button:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    ux-button[disabled] button,
    ux-button[loading] button {
      opacity: 0.6;
      cursor: not-allowed;
    }
    ux-button .spinner {
      display: inline-block;
      animation: spin 1s linear infinite;
      font-size: 1.2em;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export class UxButton extends LifecycleComponent {
  private buttonEl: HTMLButtonElement | null = null;
  private _rendered = false;

  protected onConnected(): void {
    ensureStyles();
    if (!this._rendered) {
      this.createButton();
      this._rendered = true;
    }
    this.setupAccessibility();
    this.updateLoadingState();
  }

  get variant(): 'primary' | 'secondary' | 'danger' | 'success' | 'warning' {
    return (this.getAttribute('variant') as any) || 'primary';
  }

  get size(): 'sm' | 'md' | 'lg' {
    return (this.getAttribute('size') as any) || 'md';
  }

  get loading(): boolean {
    return this.hasAttribute('loading');
  }

  set loading(value: boolean) {
    if (value) {
      this.setAttribute('loading', '');
    } else {
      this.removeAttribute('loading');
    }
    this.updateLoadingState();
  }

  private createButton(): void {
    const btn = document.createElement('button');
    (btn as HTMLButtonElement).type = (this.getAttribute('type') as any) || 'button';
    btn.setAttribute('part', 'button');

    while (this.firstChild) {
      btn.appendChild(this.firstChild);
    }
    this.appendChild(btn);
    this.buttonEl = btn;

    btn.addEventListener('click', (event) => {
      if (this.hasAttribute('disabled') || this.loading) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (this.getAttribute('type') === 'submit') {
        const form = this.closest('form');
        if (form) {
          event.preventDefault();
          event.stopPropagation();
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    });
  }

  private setupAccessibility(): void {
    if (!this.hasAttribute('type')) {
      this.setAttribute('type', 'button');
    }
    if ((this.textContent ? this.textContent.trim() === '' : true) && !this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', this.getAttribute('title') || 'Button');
    }
  }

  private updateLoadingState(): void {
    if (!this.buttonEl) return;

    const isDisabled = this.hasAttribute('disabled') || this.loading;
    this.buttonEl.disabled = isDisabled;

    if (this.loading) {
      this.setAttribute('aria-busy', 'true');
      if (!this.querySelector('.spinner')) {
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.textContent = '\u25CC';
        this.buttonEl.prepend(spinner);
      }
    } else {
      this.removeAttribute('aria-busy');
      this.querySelector('.spinner')?.remove();
    }
  }

  protected onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void {
    if (name === 'loading' || name === 'disabled') {
      this.updateLoadingState();
    }
    if (name === 'type' && this.buttonEl) {
      const typeAttr = this.getAttribute('type');
      if (typeAttr === 'submit' || typeAttr === 'reset' || typeAttr === 'button') {
        (this.buttonEl as HTMLButtonElement).type = typeAttr;
      } else {
        this.buttonEl.type = 'button';
      }
    }
  }

  static get observedAttributes(): string[] {
    return ['loading', 'disabled', 'variant', 'size', 'type'];
  }
}

if (!customElements.get('ux-button')) {
  customElements.define('ux-button', UxButton);
}
