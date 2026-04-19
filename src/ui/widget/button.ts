/**
 * UX3 Button Web Component
 *
 * Autonomous custom element used as:
 * <ux-button variant="primary">Save</ux-button>
 */
export class UxButton extends HTMLElement {
  private buttonEl: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
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

  private setupAccessibility() {
    if (!this.hasAttribute('type')) {
      this.setAttribute('type', 'button');
    }

    if ((this.textContent ? this.textContent.trim() === '' : true) && !this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', this.getAttribute('title') || 'Button');
    }
  }

  private updateLoadingState() {
    if (!this.buttonEl) return;

    const isDisabled = this.hasAttribute('disabled') || this.loading;
    this.buttonEl.disabled = isDisabled;

    if (this.loading) {
      this.setAttribute('aria-busy', 'true');
      if (!this.shadowRoot?.querySelector('.spinner')) {
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.textContent = '◌';
        this.buttonEl.prepend(spinner);
      }
    } else {
      this.removeAttribute('aria-busy');
      this.shadowRoot?.querySelector('.spinner')?.remove();
    }
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      <button part="button" type="${this.getAttribute('type') || 'button'}">
        <slot></slot>
      </button>
    `;

    this.buttonEl = this.shadowRoot.querySelector('button');

    if (this.buttonEl) {
      this.buttonEl.addEventListener('click', (event) => {
        if (this.hasAttribute('disabled') || this.loading) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      });
    }
  }

  private getStyles(): string {
    return `
      :host {
        display: inline-block;
      }

      button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: var(--ux-btn-padding);
        font-size: var(--ux-btn-font-size);
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 200ms ease;
        font-family: inherit;
        white-space: nowrap;
        user-select: none;
      }

      :host([size="sm"]) button {
        --ux-btn-padding: 0.375rem 0.75rem;
        --ux-btn-font-size: 0.875rem;
      }

      :host([size="md"]) button,
      :host(:not([size])) button {
        --ux-btn-padding: 0.5rem 1rem;
        --ux-btn-font-size: 1rem;
      }

      :host([size="lg"]) button {
        --ux-btn-padding: 0.75rem 1.5rem;
        --ux-btn-font-size: 1.125rem;
      }

      :host([variant="primary"]) button,
      :host(:not([variant])) button {
        background-color: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      :host([variant="secondary"]) button {
        background-color: #e5e7eb;
        color: #1f2937;
        border-color: #d1d5db;
      }

      :host([variant="danger"]) button {
        background-color: #ef4444;
        color: white;
        border-color: #ef4444;
      }

      :host([variant="success"]) button {
        background-color: #10b981;
        color: white;
        border-color: #10b981;
      }

      :host([variant="warning"]) button {
        background-color: #f59e0b;
        color: white;
        border-color: #f59e0b;
      }

      button:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      :host([disabled]) button,
      :host([loading]) button {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .spinner {
        display: inline-block;
        animation: spin 1s linear infinite;
        font-size: 1.2em;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
  }

  attributeChangedCallback(name: string, _oldVal: string, _newVal: string) {
    if (name === 'loading' || name === 'disabled') {
      this.updateLoadingState();
    }
    if (name === 'type' && this.buttonEl) {
      const typeAttr = this.getAttribute('type');
      if (typeAttr === 'submit' || typeAttr === 'reset' || typeAttr === 'button') {
        this.buttonEl.type = typeAttr;
      } else {
        this.buttonEl.type = 'button';
      }
    }
  }

  static get observedAttributes() {
    return ['loading', 'disabled', 'variant', 'size', 'type'];
  }
}

if (!customElements.get('ux-button')) {
  customElements.define('ux-button', UxButton);
}
