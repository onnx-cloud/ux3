/**
 * Form Rule Engine
 * 
 * Executes validation rules against form field values
 * Supports both sync and async rules with debouncing
 */

import { rules, type RuleType } from './rule-library.js';

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  type: RuleType;
  config?: any;
  message?: string;
  debounce?: number; // For async rules
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  valid: boolean;
  errors: string[];
}

export class RuleEngine {
  private ruleCache = new Map<string, { result: boolean; timestamp: number }>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private defaultDebounce = 300; // ms

  /**
   * Validate a single value against a rule
   */
  async validate(
    value: any,
    rule: ValidationRule,
    context?: Record<string, any>
  ): Promise<ValidationResult> {
    const ruleFunc = rules[rule.type] as any;
    if (!ruleFunc) {
      return { valid: false, error: `Unknown rule type: ${rule.type}` };
    }

    try {
      const result = await Promise.resolve(
        ruleFunc(value, rule.config, context)
      );

      if (!result) {
        const message = rule.message || this.getDefaultMessage(rule.type, value);
        return { valid: false, error: message };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: rule.message || `Validation error: ${String(error)}`,
      };
    }
  }

  /**
   * Validate a field against multiple rules
   */
  async validateField(
    name: string,
    value: any,
    fieldRules: ValidationRule[],
    context?: Record<string, any>
  ): Promise<FieldValidationResult> {
    const errors: string[] = [];

    for (const rule of fieldRules) {
      const result = await this.validate(value, rule, context);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate entire form data against schema
   */
  async validateForm(
    data: Record<string, any>,
    schema: Record<string, ValidationRule[]>,
    context?: Record<string, any>
  ): Promise<{ valid: boolean; errors: Record<string, string[]> }> {
    const errors: Record<string, string[]> = {};
    const isValid = true;

    for (const [fieldName, fieldRules] of Object.entries(schema)) {
      const fieldValue = data[fieldName];
      const result = await this.validateField(fieldName, fieldValue, fieldRules, context || data);

      if (!result.valid) {
        errors[fieldName] = result.errors;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Debounced validation (useful for async rules like emailUnique)
   */
  async validateFieldDebounced(
    name: string,
    value: any,
    fieldRules: ValidationRule[],
    context?: Record<string, any>
  ): Promise<FieldValidationResult> {
    return new Promise((resolve) => {
      // Clear existing debounce timer
      const existingTimer = this.debounceTimers.get(name);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Get debounce delay from first async rule or use default
      const asyncRule = fieldRules.find((r) => this.isAsyncRule(r.type));
      const delay = asyncRule?.debounce ?? this.defaultDebounce;

      // Set new debounce timer
      const timer = setTimeout(async () => {
        const result = await this.validateField(name, value, fieldRules, context);
        this.debounceTimers.delete(name);
        resolve(result);
      }, delay);

      this.debounceTimers.set(name, timer);
    });
  }

  /**
   * Clear all debounce timers (useful for cleanup)
   */
  clearDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Check if a rule type is async
   */
  private isAsyncRule(ruleType: RuleType): boolean {
    return ['emailUnique', 'usernameAvailable', 'custom'].includes(ruleType);
  }

  /**
   * Get default error message for a rule
   */
  private getDefaultMessage(ruleType: RuleType, value?: any): string {
    const messages: Record<RuleType, string> = {
      required: 'This field is required',
      minLength: 'Value is too short',
      maxLength: 'Value is too long',
      min: 'Value is too small',
      max: 'Value is too large',
      email: 'Invalid email address',
      url: 'Invalid URL',
      pattern: 'Value does not match required format',
      custom: 'Validation failed',
      emailUnique: 'Email is already in use',
      usernameAvailable: 'Username is not available',
      matches: 'Values do not match',
      integer: 'Must be a whole number',
      number: 'Must be a number',
      date: 'Invalid date',
    };

    return messages[ruleType] || 'Validation failed';
  }

  /**
   * Clear rule cache (for testing or manual cache flush)
   */
  clearCache(): void {
    this.ruleCache.clear();
  }
}
