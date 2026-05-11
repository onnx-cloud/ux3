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

function castShadow(s: unknown): ShadowRoot | null {
  return s instanceof ShadowRoot ? s as ShadowRoot : null;
}

export class UxForm extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('submit', this.onSubmit);
    this.addEventListener('ux:validate', this.onValidate as EventListener);
  }

  protected onDisconnected(): void {
    super.onDisconnected();
    this.removeEventListener('submit', this.onSubmit);
    this.removeEventListener('ux:validate', this.onValidate as EventListener);
  }

  reportValidity(): boolean {
    return this.validateForm();
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
    const valid = this.validateForm();
    if (!valid) {
      this.displayErrors(this.collectErrors());
      return;
    }
    this.dispatchEvent(new CustomEvent('ux:submit', { bubbles: true, detail: collectFieldValues(this) }));
  };

  private validateForm(): boolean {
    let valid = true;
    const inputs = this.querySelectorAll('ux-input, ux-textarea, ux-select, ux-combobox, ux-checkbox, ux-switch, input, textarea, select');
    inputs.forEach((el) => {
      const native = findNative(el);
      if (native) {
        if (!native.checkValidity()) { el.classList.add('ux-invalid'); valid = false; }
        else { el.classList.remove('ux-invalid'); }
      } else {
        const role = el.getAttribute('role');
        if ((role === 'checkbox' || role === 'switch') && el.hasAttribute('required')) {
          const stateAttr = (el as any).getStateAttr?.() || 'checked';
          if (!el.hasAttribute(stateAttr)) { el.classList.add('ux-invalid'); valid = false; }
          else { el.classList.remove('ux-invalid'); }
        }
      }
    });
    return valid;
  }

  private collectErrors(): Array<{ name: string; message: string }> {
    const errors: Array<{ name: string; message: string }> = [];
    const inputs = this.querySelectorAll('ux-input, ux-textarea, ux-select, ux-combobox, ux-checkbox, ux-switch, input, textarea, select');
    inputs.forEach((el) => {
      const name = el.getAttribute('name') || '';
      const native = findNative(el);
      if (native && !native.checkValidity()) {
        errors.push({ name, message: native.validationMessage });
        el.classList.add('ux-invalid');
      } else {
        const role = el.getAttribute('role');
        if ((role === 'checkbox' || role === 'switch') && el.hasAttribute('required')) {
          const stateAttr = (el as any).getStateAttr?.() || 'checked';
          if (!el.hasAttribute(stateAttr)) {
            errors.push({ name, message: 'This field is required' });
            el.classList.add('ux-invalid');
          }
        }
      }
    });
    return errors;
  }
}
