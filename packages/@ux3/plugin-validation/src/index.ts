import type { Plugin } from '../../../src/plugin/registry';

export type RuleResult = { valid: boolean; message?: string };
export type Rule = (value: any) => RuleResult;

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  email?: boolean;
  url?: boolean;
  [custom: string]: any;
}

/** Validate a single value against a set of rules. Returns null on success or an error message. */
export function validate(rules: ValidationRules, value: any): string | null {
  const str = value == null ? '' : String(value);

  if (rules.required && str.trim() === '') {
    return 'This field is required.';
  }
  if (rules.minLength !== undefined && str.length < rules.minLength) {
    return `Minimum length is ${rules.minLength}.`;
  }
  if (rules.maxLength !== undefined && str.length > rules.maxLength) {
    return `Maximum length is ${rules.maxLength}.`;
  }
  if (rules.email) {
    // RFC 5322 simplified
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      return 'Enter a valid email address.';
    }
  }
  if (rules.url) {
    try {
      new URL(str);
    } catch {
      return 'Enter a valid URL.';
    }
  }
  if (rules.pattern) {
    const re = rules.pattern instanceof RegExp ? rules.pattern : new RegExp(rules.pattern);
    if (!re.test(str)) {
      return 'Value does not match the required format.';
    }
  }
  return null;
}

export const ValidationPlugin: Plugin = {
  name: '@ux3/plugin-validation',
  version: '1.0.0',
  description: 'Built-in validation rules (required, minLength, maxLength, email, url, pattern).',
  install(app) {
    // expose the validate utility globally
    (app as any).utils = (app as any).utils || {};
    (app as any).utils.validate = validate;

    // optionally hook into the forms service to add rule-based validation
    const forms = app.services?.['ux3.service.forms'];
    if (forms && typeof forms.validate === 'function') {
      const originalValidate = forms.validate.bind(forms);
      (forms as any).validate = (form: HTMLFormElement, rules?: Record<string, ValidationRules>) => {
        const baseResult = originalValidate(form);
        if (!rules) return baseResult;
        // apply plugin rules per field name
        const errors: Record<string, string> = {};
        for (const [fieldName, fieldRules] of Object.entries(rules)) {
          const input = form.elements.namedItem(fieldName) as HTMLInputElement | null;
          if (!input) continue;
          const err = validate(fieldRules, input.value);
          if (err) errors[fieldName] = err;
        }
        return { ...baseResult, pluginErrors: errors, pluginValid: Object.keys(errors).length === 0 };
      };
    }
  }
};

export default ValidationPlugin;
