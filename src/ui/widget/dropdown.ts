/**
 * UX3 Dropdown / Select Component
 *
 * Custom dropdown with keyboard support, filtering, and custom rendering
 *
 * Usage:
 * <ux-dropdown name="country" placeholder="Select a country">
 *   <option value="us">United States</option>
 *   <option value="ca">Canada</option>
 *   <option value="mx">Mexico</option>
 * </ux-dropdown>
 *
 * With filtering:
 * <ux-dropdown name="country" filterable="true" placeholder="Search...">
 *   <option value="us">United States</option>
 *   ...
 * </ux-dropdown>
 *
 * Multi-select:
 * <ux-dropdown name="tags" multiple="true">
 *   <option value="tag1">Tag 1</option>
 *   ...
 * </ux-dropdown>
 */

export class UxDropdown extends HTMLElement {
  static formAssociated = true;

  private internals: ElementInternals;
  private isOpen = false;
  private selectedValues: Set<string> = new Set();
  private filteredOptions: OptionItem[] = [];
  private allOptions: OptionItem[] = [];
  private highlightedIndex = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const internals = this.attachInternals?.() as ElementInternals | undefined;
    this.internals = internals ?? ({ setFormValue: () => {} } as any);
    if (typeof this.internals.setFormValue !== 'function') {
      (this.internals as any).setFormValue = () => {};
    }
  }

  connectedCallback() {
    this.render();
    this.loadOptions();
    this.setupEventListeners();
    this.setupAccessibility();
  }

  // ==================== Attributes ====================

  get name(): string {
    return this.getAttribute('name') || '';
  }

  get placeholder(): string {
    return this.getAttribute('placeholder') || 'Select...';
  }

  get filterable(): boolean {
    return this.hasAttribute('filterable');
  }

  get multiple(): boolean {
    return this.hasAttribute('multiple');
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  get value(): string | string[] {
    if (this.multiple) {
      return Array.from(this.selectedValues);
    }
    return Array.from(this.selectedValues)[0] || '';
  }

  set value(val: string | string[]) {
    this.selectedValues.clear();
    if (Array.isArray(val)) {
      val.forEach(v => this.selectedValues.add(v));
    } else if (val) {
      this.selectedValues.add(val);
    }
    this.updateDisplay();
    this.updateFormValue();
  }

  // ==================== Options ====================

  private loadOptions() {
    this.allOptions = Array.from(this.querySelectorAll('option')).map(opt => ({
      value: opt.value,
      label: opt.textContent || opt.value,
      disabled: opt.disabled,
      element: opt
    }));
    this.filteredOptions = [...this.allOptions];
  }

  private renderOptions() {
    const optionsContainer = this.shadowRoot?.querySelector('.dropdown-options');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = this.filteredOptions.map((opt, idx) => `
      <div class="option ${idx === this.highlightedIndex ? 'highlighted' : ''} ${opt.disabled ? 'disabled' : ''}"
           data-value="${opt.value}"
           role="option"
           aria-selected="${this.selectedValues.has(opt.value)}"
           tabindex="${idx === this.highlightedIndex ? 0 : -1}">
        ${this.multiple ? `<input type="checkbox" ${this.selectedValues.has(opt.value) ? 'checked' : ''} />` : ''}
        <span>${opt.label}</span>
      </div>
    `).join('');

    // Add event listeners to option elements
    optionsContainer.querySelectorAll('.option:not(.disabled)').forEach((el, idx) => {
      el.addEventListener('click', () => this.selectOption(this.filteredOptions[idx]));
    });
  }

  // ==================== Rendering ====================

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="dropdown-wrapper">
        <button class="dropdown-toggle" type="button" aria-haspopup="listbox">
          <span class="dropdown-display">${this.placeholder}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        ${this.filterable ? '<input class="dropdown-filter" type="text" placeholder="Filter..." />' : ''}
        <div class="dropdown-options" role="listbox" aria-expanded="false"></div>
      </div>
    `;

    this.setupInternalEventListeners();
  }

  private setupInternalEventListeners() {
    const toggle = this.shadowRoot?.querySelector('.dropdown-toggle') as HTMLButtonElement;
    const filter = this.shadowRoot?.querySelector('.dropdown-filter') as HTMLInputElement;
    const options = this.shadowRoot?.querySelector('.dropdown-options') as HTMLDivElement;

    toggle?.addEventListener('click', () => this.toggleDropdown());

    if (filter) {
      filter.addEventListener('input', (e) => {
        this.filterOptions((e.target as HTMLInputElement).value);
      });
    }

    this.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  private setupEventListeners() {
    // Listen to option changes
    const observer = new MutationObserver(() => {
      this.loadOptions();
      if (this.isOpen) {
        this.renderOptions();
      }
    });

    observer.observe(this, { childList: true, subtree: true });
  }

  // ==================== Dropdown Logic ====================

  private toggleDropdown() {
    if (this.disabled) return;

    this.isOpen = !this.isOpen;
    const wrapper = this.shadowRoot?.querySelector('.dropdown-wrapper');
    const toggle = this.shadowRoot?.querySelector('.dropdown-toggle') as HTMLButtonElement;
    const options = this.shadowRoot?.querySelector('.dropdown-options') as HTMLDivElement;

    if (this.isOpen) {
      wrapper?.classList.add('open');
      toggle?.setAttribute('aria-expanded', 'true');
      options?.setAttribute('aria-expanded', 'true');
      this.renderOptions();
      
      // Focus filter input if filterable
      setTimeout(() => {
        const filter = this.shadowRoot?.querySelector('.dropdown-filter') as HTMLInputElement;
        if (filter) filter.focus();
      }, 0);
    } else {
      wrapper?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      options?.setAttribute('aria-expanded', 'false');
      toggle?.focus();
    }
  }

  private filterOptions(query: string) {
    const lowerQuery = query.toLowerCase();
    this.filteredOptions = this.allOptions.filter(opt =>
      opt.label.toLowerCase().includes(lowerQuery) && !opt.disabled
    );
    this.highlightedIndex = 0;
    this.renderOptions();
  }

  private selectOption(option: OptionItem) {
    if (option.disabled) return;

    if (this.multiple) {
      if (this.selectedValues.has(option.value)) {
        this.selectedValues.delete(option.value);
      } else {
        this.selectedValues.add(option.value);
      }
      this.renderOptions();
    } else {
      this.selectedValues.clear();
      this.selectedValues.add(option.value);
      this.toggleDropdown();
    }

    this.updateDisplay();
    this.updateFormValue();

    // Emit change event
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  private updateDisplay() {
    const display = this.shadowRoot?.querySelector('.dropdown-display');
    if (!display) return;

    if (this.selectedValues.size === 0) {
      display.textContent = this.placeholder;
    } else if (this.multiple) {
      const labels = Array.from(this.selectedValues).map(val =>
        this.allOptions.find(opt => opt.value === val)?.label || val
      );
      display.textContent = labels.join(', ');
    } else {
      const label = this.allOptions.find(opt => opt.value === Array.from(this.selectedValues)[0])?.label;
      display.textContent = label || this.placeholder;
    }
  }

  private updateFormValue() {
    const val = this.multiple ? Array.from(this.selectedValues) : (Array.from(this.selectedValues)[0] || '');
    this.internals.setFormValue(JSON.stringify(val));
  }

  // ==================== Keyboard Navigation ====================

  private handleKeydown(e: KeyboardEvent) {
    if (!this.isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredOptions.length - 1);
        this.renderOptions();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this.renderOptions();
        break;

      case 'Enter':
        e.preventDefault();
        this.selectOption(this.filteredOptions[this.highlightedIndex]);
        break;

      case 'Escape':
        e.preventDefault();
        this.toggleDropdown();
        break;

      case 'Tab':
        this.toggleDropdown();
        break;
    }
  }

  // ==================== Accessibility ====================

  private setupAccessibility() {
    this.setAttribute('role', 'combobox');
    this.setAttribute('aria-haspopup', 'listbox');
    
    const toggle = this.shadowRoot?.querySelector('.dropdown-toggle');
    toggle?.setAttribute('aria-controls', 'dropdown-options');
  }

  // ==================== Styles ====================

  private getStyles(): string {
    return `
      :host {
        --dropdown-bg: white;
        --dropdown-text: #1f2937;
        --dropdown-border: #d1d5db;
        --dropdown-hover: #f3f4f6;
        --dropdown-highlight: #e0e7ff;
        --dropdown-z-index: 100;
      }

      .dropdown-wrapper {
        position: relative;
        display: inline-block;
        width: 100%;
        font-family: inherit;
      }

      .dropdown-toggle {
        width: 100%;
        padding: 0.5rem 0.75rem;
        background-color: var(--dropdown-bg);
        border: 1px solid var(--dropdown-border);
        border-radius: 0.375rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1rem;
        transition: all 200ms ease;
        color: var(--dropdown-text);
      }

      .dropdown-toggle:hover {
        border-color: #9ca3af;
      }

      .dropdown-toggle:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .dropdown-toggle[aria-expanded="true"] {
        border-color: #3b82f6;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }

      .dropdown-arrow {
        font-size: 0.75rem;
        transition: transform 200ms ease;
      }

      .dropdown-wrapper.open .dropdown-arrow {
        transform: rotate(180deg);
      }

      .dropdown-filter {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--dropdown-border);
        border-top: none;
        font-size: 1rem;
        font-family: inherit;
      }

      .dropdown-options {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background-color: var(--dropdown-bg);
        border: 1px solid var(--dropdown-border);
        border-top: none;
        border-bottom-left-radius: 0.375rem;
        border-bottom-right-radius: 0.375rem;
        max-height: 300px;
        overflow-y: auto;
        z-index: var(--dropdown-z-index);
        display: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .dropdown-wrapper.open .dropdown-options {
        display: block;
      }

      .option {
        padding: 0.5rem 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: background-color 200ms;
        color: var(--dropdown-text);
      }

      .option:hover:not(.disabled) {
        background-color: var(--dropdown-hover);
      }

      .option.highlighted:not(.disabled) {
        background-color: var(--dropdown-highlight);
      }

      .option.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        color: #9ca3af;
      }

      .option input[type="checkbox"] {
        cursor: pointer;
      }

      :host([disabled]) {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (name === 'disabled') {
      const toggle = this.shadowRoot?.querySelector('.dropdown-toggle') as HTMLButtonElement;
      if (toggle) {
        toggle.disabled = this.disabled;
      }
    }
  }

  static get observedAttributes() {
    return ['disabled', 'filterable', 'multiple'];
  }
}

interface OptionItem {
  value: string;
  label: string;
  disabled: boolean;
  element: HTMLOptionElement;
}

if (!customElements.get('ux-dropdown')) {
  customElements.define('ux-dropdown', UxDropdown);
}
