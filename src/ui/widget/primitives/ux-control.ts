import { UxBase } from './base.js';

export abstract class UxControl extends UxBase {
  static formAssociated = true;

  protected internals: ElementInternals;
  private _touched = false;
  private _dirty = false;
  private _customError = '';

  constructor() {
    super();
    this.internals = (this.attachInternals?.() as ElementInternals | undefined)
      ?? ({} as ElementInternals);
  }

  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('blur', this._onBlurBound);
    this.addEventListener('ux:input.change', this._onInputChangeBound);
    this.syncValidity();
  }

  protected onDisconnected(): void {
    this.removeEventListener('blur', this._onBlurBound);
    this.removeEventListener('ux:input.change', this._onInputChangeBound);
    super.onDisconnected();
  }

  private readonly _onBlurBound = (): void => {
    this._touched = true;
  };

  private readonly _onInputChangeBound = (): void => {
    this._dirty = true;
    this.setFormValueFromAttribute();
    this.syncValidity();
  };

  // ── Form contract ────────────────────────────────────────────────

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(v: string) {
    this.setAttribute('value', v);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(v: string) {
    if (v) this.setAttribute('name', v);
    else this.removeAttribute('name');
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(v: boolean) {
    if (v) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(v: boolean) {
    if (v) this.setAttribute('required', '');
    else this.removeAttribute('required');
  }

  get touched(): boolean {
    return this._touched;
  }

  get dirty(): boolean {
    return this._dirty;
  }

  get validity(): ValidityState {
    if (typeof this.internals?.validity !== 'undefined') {
      return this.internals.validity;
    }
    const flags: Partial<ValidityStateFlags> = {};
    if (this.required && !this.value) {
      (flags as any).valueMissing = true;
    }
    if (this._customError) {
      (flags as any).customError = true;
    }
    return {
      valueMissing: !!flags.valueMissing,
      typeMismatch: false,
      patternMismatch: false,
      tooLong: false,
      tooShort: false,
      rangeUnderflow: false,
      rangeOverflow: false,
      stepMismatch: false,
      badInput: false,
      customError: !!this._customError,
      valid: !flags.valueMissing && !this._customError,
    };
  }

  checkValidity(): boolean {
    return this.validity.valid;
  }

  reportValidity(): boolean {
    const valid = this.checkValidity();
    this.dispatchEvent(new CustomEvent('ux:validated', {
      bubbles: true,
      composed: true,
      detail: { valid, errors: !valid ? [this._customError || 'Invalid value'] : [] },
    }));
    return valid;
  }

  setCustomValidity(message: string): void {
    this._customError = message || '';
    if (this._customError) {
      if (!this.hasAttribute('aria-invalid')) {
        this.setAttribute('aria-invalid', 'true');
      }
    } else {
      this.removeAttribute('aria-invalid');
    }
    this.internals?.setValidity?.(
      this._customError ? { customError: true } : {},
      this._customError || undefined,
    );
  }

  // ── Internal helpers ─────────────────────────────────────────────

  protected setFormValueFromAttribute(): void {
    const val = this.getAttribute('value');
    if (val !== null && typeof this.internals?.setFormValue === 'function') {
      this.internals.setFormValue(val);
    }
  }

  protected syncValidity(): void {
    this.setCustomValidity(this._customError);
  }

  // ── Event emission ───────────────────────────────────────────────

  protected emitChange(): void {
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value, name: this.name },
    }));
  }

  protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
    super.onAttributeChanged?.(name, oldValue, newValue);
    if (name === 'value' && oldValue !== newValue) {
      this.setFormValueFromAttribute();
      this.emitChange();
    }
  }
}
