/**
 * UX3 Forms Plugin
 * Form validation, submission, and error handling
 */

export type ValidationRule = (value: any) => boolean | string;

export interface FieldValidator {
  required?: boolean | string;
  min?: number | string;
  max?: number | string;
  pattern?: RegExp | string;
  custom?: ValidationRule;
}

export interface FormConfig {
  fields: Record<string, FieldValidator>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  onError?: (errors: Record<string, string>) => void;
}

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Form validation and handling
 */
export class FormValidator {
  private config: FormConfig;
  private errors: Map<string, string> = new Map();
  private touched: Set<string> = new Set();

  constructor(config: FormConfig) {
    this.config = config;
  }

  /**
   * Validate single field
   */
  validateField(field: string, value: any): boolean {
    const rules = this.config.fields[field];
    if (!rules) return true;

    // Required validation
    if (rules.required && !value) {
      this.setError(field, typeof rules.required === 'string' ? rules.required : 'This field is required');
      return false;
    }

    // Min validation
    if (rules.min && value && value.length < rules.min) {
      this.setError(field, `Minimum ${rules.min} characters required`);
      return false;
    }

    // Max validation
    if (rules.max && value && value.length > rules.max) {
      this.setError(field, `Maximum ${rules.max} characters allowed`);
      return false;
    }

    // Pattern validation
    if (rules.pattern) {
      const pattern = typeof rules.pattern === 'string' ? new RegExp(rules.pattern) : rules.pattern;
      if (!pattern.test(value)) {
        this.setError(field, 'Invalid format');
        return false;
      }
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value);
      if (result !== true) {
        this.setError(field, typeof result === 'string' ? result : 'Validation failed');
        return false;
      }
    }

    this.clearError(field);
    return true;
  }

  /**
   * Validate all fields
   */
  validateAll(data: Record<string, any>): boolean {
    let isValid = true;

    for (const field of Object.keys(this.config.fields)) {
      if (!this.validateField(field, data[field])) {
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Set field error
   */
  private setError(field: string, message: string): void {
    this.errors.set(field, message);
  }

  /**
   * Clear field error
   */
  private clearError(field: string): void {
    this.errors.delete(field);
  }

  /**
   * Get field error
   */
  getError(field: string): string | undefined {
    return this.errors.get(field);
  }

  /**
   * Get all errors
   */
  getErrors(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }

  /**
   * Mark field as touched
   */
  touchField(field: string): void {
    this.touched.add(field);
  }

  /**
   * Check if field is touched
   */
  isTouched(field: string): boolean {
    return this.touched.has(field);
  }

  /**
   * Reset validation state
   */
  reset(): void {
    this.errors.clear();
    this.touched.clear();
  }
}

/**
 * Form submission handler
 */
export class FormHandler {
  private validator: FormValidator;
  private isSubmitting = false;

  constructor(config: FormConfig) {
    this.validator = new FormValidator(config);
  }

  /**
   * Handle form submission
   */
  async handleSubmit(data: Record<string, any>): Promise<boolean> {
    if (this.isSubmitting) return false;

    this.isSubmitting = true;

    // Validate form
    if (!this.validator.validateAll(data)) {
      this.isSubmitting = false;
      return false;
    }

    try {
      // TODO: Call onSubmit callback
      this.isSubmitting = false;
      return true;
    } catch (error) {
      this.isSubmitting = false;
      return false;
    }
  }

  /**
   * Get validator
   */
  getValidator(): FormValidator {
    return this.validator;
  }
}

export function createFormValidator(config: FormConfig): FormValidator {
  return new FormValidator(config);
}

export function createFormHandler(config: FormConfig): FormHandler {
  return new FormHandler(config);
}
