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
import { LifecycleComponent } from '../../lifecycle-component.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-button-style';
const STYLE_CSS = `
  ux-button { display: inline-block; }
  ux-button button {
    display: inline-flex; align-items: center; gap: var(--spacing-sm, 0.5rem);
    font-family: inherit; font-weight: 500;
    border-radius: var(--radius-md, 0.375rem);
    border: 1px solid transparent;
    cursor: pointer; transition: var(--transition-normal, all 200ms ease);
    white-space: nowrap; user-select: none;
  }
  ux-button[size="xs"] button { padding: var(--spacing-xxs, 0.25rem) var(--spacing-xs, 0.5rem); font-size: 0.75rem; }
  ux-button[size="sm"] button { padding: var(--spacing-xs, 0.375rem) var(--spacing-sm, 0.75rem); font-size: 0.875rem; }
  ux-button[size="md"] button, ux-button:not([size]) button { padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem); font-size: 1rem; }
  ux-button[size="lg"] button { padding: var(--spacing-sm, 0.75rem) var(--spacing-lg, 1.5rem); font-size: 1.125rem; }
  ux-button[size="xl"] button { padding: var(--spacing-md, 0.75rem) var(--spacing-xl, 2rem); font-size: 1.25rem; }
  ux-button[variant="primary"] button, ux-button:not([variant]) button {
    background-color: var(--color-primary, #6b7280); color: white; border-color: var(--color-primary, #6b7280);
  }
  ux-button[variant="secondary"] button {
    background-color: var(--color-surface-tertiary, #e5e7eb); color: var(--color-text-default, #1f2937); border-color: var(--color-border-default, #d1d5db);
  }
  ux-button[variant="danger"] button {
    background-color: var(--color-danger, #ef4444); color: white; border-color: var(--color-danger, #ef4444);
  }
  ux-button[variant="success"] button {
    background-color: var(--color-success, #10b981); color: white; border-color: var(--color-success, #10b981);
  }
  ux-button[variant="warning"] button {
    background-color: var(--color-warning, #f59e0b); color: white; border-color: var(--color-warning, #f59e0b);
  }
  ux-button[variant="none"] button {
    background-color: transparent; color: var(--color-text, #0f172a); border-color: transparent;
  }
  ux-button[variant="none"] button:hover {
    background-color: var(--color-bg-muted, #f3f4f6);
  }
  ux-button button:focus-visible { outline: var(--focus-outline, 2px solid #6b7280); outline-offset: var(--focus-outline-offset, 2px); }
  ux-button[disabled] button, ux-button[loading] button { opacity: var(--opacity-disabled, 0.6); cursor: var(--cursor-disabled, not-allowed); }
  ux-button .spinner { display: inline-block; animation: spin 1s linear infinite; font-size: 1.2em; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxButton extends LifecycleComponent {
  private buttonEl: HTMLButtonElement | null = null;
  private _rendered = false;

  protected onConnected(): void {
    if (!this._rendered) {
      this.createButton();
      this._rendered = true;
    }
    this.setupAccessibility();
    this.updateLoadingState();
  }

  get variant(): 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'none' {
    return (this.getAttribute('variant') as any) || 'primary';
  }

  get size(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
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
