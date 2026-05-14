import { UxBase } from './base.js';
import { collectFieldValues } from './helpers.js';

function findNative(el: Element): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el;
  }
  let native = el.querySelector?.('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  if (native) return native;
  if (el.shadowRoot) {
    native = el.shadowRoot.querySelector('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (native) return native;
  }
  return null;
}

function isFormControl(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) return true;
  const uxTags = ['ux-input', 'ux-textarea', 'ux-select', 'ux-combobox', 'ux-checkbox',
    'ux-switch', 'ux-radio-group', 'ux-date-picker', 'ux-file-upload', 'ux-search-bar',
    'ux-slider'];
  if (uxTags.includes(tag)) return true;
  const role = el.getAttribute('role');
  if (role === 'checkbox' || role === 'switch' || role === 'radiogroup' || role === 'textbox') return true;
  return false;
}

function resolveFieldWrapper(el: Element): HTMLElement | null {
  const parent = el.parentElement;
  if (!parent) return null;
  if (parent.tagName.toLowerCase() === 'ux-field') return parent;
  return null;
}

function getFieldName(el: Element): string {
  if (el.hasAttribute('name')) return el.getAttribute('name') || '';
  const field = resolveFieldWrapper(el);
  if (field) return field.getAttribute('name') || '';
  return '';
}

function getFieldValue(el: Element): string | null {
  const native = findNative(el);
  if (native) return native.value;
  const tag = el.tagName.toLowerCase();
  if (el.hasAttribute('value')) return el.getAttribute('value');
  if (el.getAttribute('role') === 'radiogroup') return el.getAttribute('value') || '';
  if (['ux-checkbox', 'ux-switch'].includes(tag)) {
    return el.hasAttribute('checked') ? 'on' : '';
  }
  return null;
}

const FIELD_SELECTORS = [
  'ux-input', 'ux-textarea', 'ux-select', 'ux-combobox', 'ux-checkbox',
  'ux-switch', 'ux-radio-group', 'ux-date-picker', 'ux-file-upload',
  'ux-search-bar', 'ux-slider', 'ux-field-array',
  'input', 'textarea', 'select',
  '[role="checkbox"]', '[role="switch"]', '[role="radiogroup"]', '[role="textbox"]',
];

export class UxForm extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('submit', this.onSubmit);
    this.addEventListener('ux:validate', this.onValidate as EventListener);
    if (!this.hasAttribute('novalidate')) {
      this.setAttribute('novalidate', '');
    }
  }

  protected onDisconnected(): void {
    super.onDisconnected();
    this.removeEventListener('submit', this.onSubmit);
    this.removeEventListener('ux:validate', this.onValidate as EventListener);
  }

  checkValidity(): boolean {
    return this.validateForm();
  }

  reportValidity(): boolean {
    const valid = this.validateForm();
    const errors = this.collectErrors();
    this.displayErrors(errors);
    return valid;
  }

  submit(): void {
    const valid = this.validateForm();
    if (!valid) {
      this.displayErrors(this.collectErrors());
      const firstInvalid = this.querySelector('.ux-invalid') as HTMLElement;
      if (firstInvalid) {
        const native = findNative(firstInvalid);
        if (native) native.focus();
        else firstInvalid.focus();
      }
      return;
    }
    this.dispatchEvent(new CustomEvent('ux:submit', {
      bubbles: true, cancelable: true,
      detail: collectFieldValues(this),
    }));
  }

  reset(): void {
    const inputs = this.querySelectorAll(FIELD_SELECTORS.join(','));
    inputs.forEach((el) => {
      const native = findNative(el);
      if (native) {
        if (native instanceof HTMLSelectElement) {
          native.selectedIndex = 0;
        } else {
          native.value = native.defaultValue;
        }
        native.classList.remove('ux-invalid');
      }
      el.classList.remove('ux-invalid');
      if (el instanceof HTMLInputElement) {
        el.value = el.defaultValue;
      }
    });
    const errorContainers = this.querySelectorAll('ux-form-errors');
    errorContainers.forEach((c) => {
      (c as HTMLElement).innerHTML = '';
      (c as HTMLElement).style.display = 'none';
    });
  }

  private displayErrors(errors: Array<{ name: string; message: string }>): void {
    const container = this.querySelector('ux-form-errors') as HTMLElement;
    if (!container) return;
    container.innerHTML = errors.map(e =>
      `<div class="ux-form-error-item" style="color:var(--ux-form-error-color,#dc2626);font-size:0.8125rem;margin-bottom:0.25rem">${e.name ? `<strong>${e.name}</strong>: ` : ''}${e.message}</div>`
    ).join('');
    container.style.display = errors.length ? '' : 'none';
  }

  private readonly onValidate = (): void => {
    const valid = this.validateForm();
    const errors = this.collectErrors();
    this.displayErrors(errors);
    this.dispatchEvent(new CustomEvent('ux:validated', { bubbles: true, detail: { valid, errors } }));
  };

  private readonly onSubmit = (event: Event): void => {
    event.preventDefault();
    this.submit();
  };

  private validateForm(): boolean {
    let valid = true;
    const inputs = this.querySelectorAll(FIELD_SELECTORS.join(','));
    inputs.forEach((el) => {
      const native = findNative(el);
      if (native) {
        const name = getFieldName(el);
        const isRequired = el.hasAttribute('required') || this.isFieldRequired(name);
        if (isRequired && !native.value) {
          el.classList.add('ux-invalid'); valid = false;
          return;
        }
        const fieldValid = native.checkValidity();
        if (!fieldValid) { el.classList.add('ux-invalid'); valid = false; }
        else { el.classList.remove('ux-invalid'); }
        const field = resolveFieldWrapper(el);
        if (field) {
          if (!fieldValid) field.classList.add('ux-invalid');
          else field.classList.remove('ux-invalid');
        }
      } else {
        const role = el.getAttribute('role');
        const name = getFieldName(el);
        const isRequired = el.hasAttribute('required') || this.isFieldRequired(name);
        if ((role === 'checkbox' || role === 'switch') && isRequired) {
          const stateAttr = (el as any).getStateAttr?.() || 'checked';
          if (!el.hasAttribute(stateAttr)) { el.classList.add('ux-invalid'); valid = false; }
          else { el.classList.remove('ux-invalid'); }
        }
        if (role === 'radiogroup' && isRequired) {
          const value = el.getAttribute('value');
          if (!value) { el.classList.add('ux-invalid'); valid = false; }
          else { el.classList.remove('ux-invalid'); }
        }
      }
    });
    return valid;
  }

  private isFieldRequired(name: string): boolean {
    if (!name) return false;
    const field = this.querySelector(`ux-field[name="${name}"]`);
    return field?.hasAttribute('required') ?? false;
  }

  private collectErrors(): Array<{ name: string; message: string }> {
    const errors: Array<{ name: string; message: string }> = [];
    const inputs = this.querySelectorAll(FIELD_SELECTORS.join(','));
    inputs.forEach((el) => {
      const name = getFieldName(el);
      const native = findNative(el);
      if (native) {
        const isRequired = el.hasAttribute('required') || this.isFieldRequired(name);
        if (isRequired && !native.value) {
          errors.push({ name, message: 'This field is required' });
          el.classList.add('ux-invalid');
          return;
        }
        if (!native.checkValidity()) {
          errors.push({ name, message: native.validationMessage });
          el.classList.add('ux-invalid');
        }
      } else {
        const role = el.getAttribute('role');
        if ((role === 'checkbox' || role === 'switch') && el.hasAttribute('required')) {
          const stateAttr = (el as any).getStateAttr?.() || 'checked';
          if (!el.hasAttribute(stateAttr)) {
            errors.push({ name, message: 'This field is required' });
            el.classList.add('ux-invalid');
          }
        }
        if (role === 'radiogroup' && el.hasAttribute('required')) {
          const value = el.getAttribute('value');
          if (!value) {
            errors.push({ name, message: 'This field is required' });
            el.classList.add('ux-invalid');
          }
        }
      }
    });
    return errors;
  }
}
