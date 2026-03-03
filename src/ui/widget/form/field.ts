/**
 * UX3 Form Field Component
 *
 * Encapsulates label + input + error + focus management
 * Integrates with ElementInternals for proper form association
 * Auto-infers label from i18n based on name and context
 *
 * Usage (auto-infer):
 * <ux-field name="email" type="email" required error="{{ctx.errors.email}}">
 *   <input slot="control" />
 * </ux-field>
 *
 * Usage (explicit override):
 * <ux-field name="email" label="Custom Label" type="email" required>
 *   <input slot="control" />
 * </ux-field>
 */

export class UxField extends HTMLElement {
  static formAssociated = true;

  private internals: ElementInternals;
  private controlSlot: HTMLSlotElement | null = null;
  private errorEl: HTMLDivElement | null = null;
  private labelEl: HTMLLabelElement | null = null;
  private control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.internals = this.attachInternals();
  }

  connectedCallback() {
    this.render();
    this.setupSlotListener();
    this.setupValidation();
    this.setupAccessibility();
  }

  // ==================== Attributes ====================

  get name(): string {
    return this.getAttribute('name') || '';
  }

  get context(): string {
    return this.getAttribute('context') || this.inferContext();
  }

  /**
   * Get label: explicit attribute > auto-inferred from i18n > empty string
   * If label="" (empty string), it's still explicit and prevents auto-infer
   */
  get label(): string {
    if (this.hasAttribute('label')) {
      return this.getAttribute('label') || '';
    }
    return this.inferLabel();
  }

  get type(): string {
    return this.getAttribute('type') || 'text';
  }

  get required(): boolean {
    return this.hasAttribute('required');
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  get error(): string {
    return this.getAttribute('error') || '';
  }

  get touched(): boolean {
    return this.hasAttribute('touched');
  }

  get hint(): string {
    return this.getAttribute('hint') || '';
  }

  /**
   * Infer form context from parent view or data-context attribute
   * Priority: data-context attr > ux-style > default to 'common'
   */
  private inferContext(): string {
    // Check data-context on this element or parents
    const contextAttr = this.closest('[data-context]');
    if (contextAttr) {
      const ctx = contextAttr.getAttribute('data-context');
      if (ctx) return ctx;
    }

    // Try to infer from ux-style on parent form/div
    const styledParent = this.closest('[ux-style]');
    if (styledParent) {
      const style = styledParent.getAttribute('ux-style');
      if (style) {
        // Extract context from style like "form-register" -> "register"
        const match = style.match(/^form-(.+)$/) || style.match(/^(.+)-form$/);
        if (match?.[1]) return match[1];
      }
    }

    return 'common';
  }

  /**
   * Infer label from i18n using context + field name
   * Expected key: {{i18n.{context}.fields.{name}.label}}
   */
  private inferLabel(): string {
    if (!this.name) return '';
    const ctx = this.context;
    return `{{i18n.${ctx}.fields.${this.name}.label}}`;
  }

  set error(value: string) {
    if (value) {
      this.setAttribute('error', value);
    } else {
      this.removeAttribute('error');
    }
    this.updateError();
  }

  setAttribute(name: string, value: string): void {
    super.setAttribute(name, value);
    if (['error', 'touched', 'disabled', 'required'].includes(name)) {
      this.updateError();
      this.updateAccessibility();
    }
  }

  removeAttribute(name: string): void {
    super.removeAttribute(name);
    if (['error', 'touched', 'disabled', 'required'].includes(name)) {
      this.updateError();
      this.updateAccessibility();
    }
  }

  // ==================== Rendering ====================

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="field-container">
        <label class="label" for="control"></label>
        <div class="control-wrapper">
          <slot name="control"></slot>
        </div>
        <div class="hint"></div>
        <div class="error" role="alert"></div>
      </div>
    `;

    this.labelEl = this.shadowRoot.querySelector('.label');
    this.errorEl = this.shadowRoot.querySelector('.error');
    this.controlSlot = this.shadowRoot.querySelector('slot[name="control"]');

    this.updateLabel();
    this.updateError();
    this.updateHint();
  }

  private updateLabel() {
    if (!this.labelEl) return;
    this.labelEl.textContent = this.label;
    this.labelEl.htmlFor = 'control';
  }

  private updateHint() {
    if (!this.shadowRoot) return;
    const hintEl = this.shadowRoot.querySelector('.hint');
    if (hintEl) {
      if (this.hint) {
        hintEl.textContent = this.hint;
        hintEl.style.display = 'block';
      } else {
        hintEl.style.display = 'none';
      }
    }
  }

  // ==================== Slot Management ====================

  private setupSlotListener() {
    if (!this.controlSlot) return;

    this.controlSlot.addEventListener('slotchange', () => {
      const nodes = this.controlSlot!.assignedElements();
      if (nodes.length > 0) {
        const element = nodes[0] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        this.control = element;
        this.syncControlAttributes();
        this.setupValidation();
      }
    });

    // Try to get control immediately
    const assigned = this.controlSlot.assignedElements();
    if (assigned.length > 0) {
      this.control = assigned[0] as any;
      this.syncControlAttributes();
    }
  }

  private syncControlAttributes() {
    if (!this.control) return;

    // Set name attribute on control
    if (this.name) {
      this.control.setAttribute('name', this.name);
    }

    // Set type if input
    if (this.control instanceof HTMLInputElement && this.type) {
      this.control.setAttribute('type', this.type);
    }

    // Set required
    if (this.required) {
      this.control.setAttribute('required', '');
    } else {
      this.control.removeAttribute('required');
    }

    // Set disabled
    if (this.disabled) {
      this.control.setAttribute('disabled', '');
    } else {
      this.control.removeAttribute('disabled');
    }

    // Bind input event to form association
    this.control.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.internals.setFormValue(target.value);
    });

    // Emit field change event
    this.control.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.dispatchEvent(
        new CustomEvent('field-change', {
          detail: { name: this.name, value: target.value },
          bubbles: true,
          composed: true,
        })
      );
    });

    // Mark as touched on blur
    this.control.addEventListener('blur', () => {
      this.setAttribute('touched', '');
    });
  }

  // ==================== Validation ====================

  private setupValidation() {
    if (!this.control) return;

    // Listen for validation-related attribute changes
    const observer = new MutationObserver(() => {
      if (this.error) {
        this.internals.setValidity({ customError: true }, this.error);
      } else {
        this.internals.setValidity({});
      }
    });

    observer.observe(this, { attributes: true, attributeFilter: ['error'] });
  }

  // ==================== Accessibility ====================

  private setupAccessibility() {
    if (!this.control) return;

    this.control.setAttribute('id', `control-${this.name || 'field'}`);

    if (this.error) {
      const errorId = `error-${this.name || 'field'}`;
      this.control.setAttribute('aria-describedby', errorId);
      this.internals.setValidity({ customError: true }, this.error);
    }

    if (this.required) {
      this.control.setAttribute('aria-required', 'true');
    }
  }

  private updateAccessibility() {
    if (!this.control) return;

    const errorId = `error-${this.name || 'field'}`;

    if (this.error) {
      this.control.setAttribute('aria-invalid', 'true');
      this.control.setAttribute('aria-describedby', errorId);
      this.internals.setValidity({ customError: true }, this.error);
    } else {
      this.control.removeAttribute('aria-invalid');
      this.control.removeAttribute('aria-describedby');
      this.internals.setValidity({});
    }

    if (this.required) {
      this.control.setAttribute('aria-required', 'true');
    } else {
      this.control.removeAttribute('aria-required');
    }
  }

  // ==================== Error Management ====================

  private updateError() {
    if (!this.errorEl) return;

    if (this.error && this.touched) {
      this.errorEl.textContent = this.error;
      this.errorEl.style.display = 'block';
      this.errorEl.setAttribute('role', 'alert');
    } else {
      this.errorEl.style.display = 'none';
      this.errorEl.textContent = '';
    }
  }

  // ==================== Attribute Observation ====================

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (name === 'error' || name === 'touched') {
      this.updateError();
      this.updateAccessibility();
    }
    if (name === 'label') {
      this.updateLabel();
    }
    if (name === 'hint') {
      this.updateHint();
    }
  }

  static get observedAttributes() {
    return ['error', 'touched', 'disabled', 'label', 'context', 'hint', 'required'];
  }

  // ==================== Styles ====================

  private getStyles(): string {
    return `
      :host {
        display: block;
        margin-bottom: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 1rem;
        line-height: 1.5;
      }

      .field-container {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .label {
        display: block;
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 0.25rem;
      }

      :host([required]) .label::after {
        content: " *";
        color: #dc2626;
      }

      .control-wrapper {
        position: relative;
      }

      .control-wrapper ::slotted(input),
      .control-wrapper ::slotted(textarea),
      .control-wrapper ::slotted(select) {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 1rem;
        font-family: inherit;
        transition: all 200ms ease;
      }

      .control-wrapper ::slotted(input:focus),
      .control-wrapper ::slotted(textarea:focus),
      .control-wrapper ::slotted(select:focus) {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .control-wrapper ::slotted(input[aria-invalid="true"]),
      .control-wrapper ::slotted(textarea[aria-invalid="true"]),
      .control-wrapper ::slotted(select[aria-invalid="true"]) {
        border-color: #dc2626;
      }

      .control-wrapper ::slotted(input[aria-invalid="true"]:focus),
      .control-wrapper ::slotted(textarea[aria-invalid="true"]:focus),
      .control-wrapper ::slotted(select[aria-invalid="true"]:focus) {
        border-color: #dc2626;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
      }

      .control-wrapper ::slotted(input:disabled),
      .control-wrapper ::slotted(textarea:disabled),
      .control-wrapper ::slotted(select:disabled) {
        background-color: #f3f4f6;
        color: #6b7280;
        cursor: not-allowed;
      }

      .hint {
        display: none;
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      .error {
        display: none;
        font-size: 0.875rem;
        color: #dc2626;
        margin-top: 0.25rem;
        font-weight: 500;
      }

      :host([error][touched]) .error {
        display: block;
      }
    `;
  }
}

if (!customElements.get('ux-field')) {
  customElements.define('ux-field', UxField);
}
