/**
 * Built-in Validation Rules
 * 
 * Composable, async-capable rules for form validation
 */

/**
 * Rule function signature: async validator that returns true if valid
 */
export type RuleFunction = (
  value: any,
  config?: any,
  context?: Record<string, any>
) => Promise<boolean> | boolean;

/**
 * Built-in validation rules
 */
export const rules = {
  /**
   * Check if value is not empty
   */
  required: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  /**
   * Check minimum length (for strings and arrays)
   */
  minLength: (value: any, config?: { minLength: number }): boolean => {
    if (!value) return true; // Allow empty if not required
    const min = config?.minLength ?? 0;
    const len = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
    return len >= min;
  },

  /**
   * Check maximum length (for strings and arrays)
   */
  maxLength: (value: any, config?: { maxLength: number }): boolean => {
    if (!value) return true;
    const max = config?.maxLength ?? Infinity;
    const len = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
    return len <= max;
  },

  /**
   * Check minimum value (for numbers)
   */
  min: (value: any, config?: { min: number }): boolean => {
    if (value === null || value === undefined || value === '') return true;
    const minVal = config?.min ?? -Infinity;
    return Number(value) >= minVal;
  },

  /**
   * Check maximum value (for numbers)
   */
  max: (value: any, config?: { max: number }): boolean => {
    if (value === null || value === undefined || value === '') return true;
    const maxVal = config?.max ?? Infinity;
    return Number(value) <= maxVal;
  },

  /**
   * Validate email format
   */
  email: (value: string): boolean => {
    if (!value) return true;
    // RFC 5322 compliant basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  /**
   * Validate URL format
   */
  url: (value: string): boolean => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate regex pattern
   */
  pattern: (value: string, config?: { pattern: string | RegExp }): boolean => {
    if (!value) return true;
    if (!config?.pattern) return true;
    const regex = typeof config.pattern === 'string' ? new RegExp(config.pattern) : config.pattern;
    return regex.test(value);
  },

  /**
   * Custom validator function
   */
  custom: (value: any, config?: { validator: (v: any) => boolean | Promise<boolean> }): boolean | Promise<boolean> => {
    if (!config?.validator) return true;
    return config.validator(value);
  },

  /**
   * Async: Check email uniqueness (calls server)
   */
  emailUnique: async (value: string, config?: { checkUrl?: string }): Promise<boolean> => {
    if (!value) return true;
    const url = config?.checkUrl ?? '/api/check-email';
    try {
      const resp = await fetch(`${url}?email=${encodeURIComponent(value)}`);
      return resp.ok;
    } catch {
      return false;
    }
  },

  /**
   * Async: Check username availability
   */
  usernameAvailable: async (value: string, config?: { checkUrl?: string }): Promise<boolean> => {
    if (!value) return true;
    const url = config?.checkUrl ?? '/api/check-username';
    try {
      const resp = await fetch(`${url}?username=${encodeURIComponent(value)}`);
      return resp.ok;
    } catch {
      return false;
    }
  },

  /**
   * Cross-field validation: value matches another field
   */
  matches: (
    value: string,
    config?: { other: string },
    context?: Record<string, any>
  ): boolean => {
    if (!config?.other || !context) return true;
    return value === context[config.other];
  },

  /**
   * Validate as integer
   */
  integer: (value: any): boolean => {
    if (value === null || value === undefined || value === '') return true;
    return Number.isInteger(Number(value));
  },

  /**
   * Validate as number
   */
  number: (value: any): boolean => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(Number(value));
  },

  /**
   * Validate valid date
   */
  date: (value: any): boolean => {
    if (!value) return true;
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
};

export type RuleType = keyof typeof rules;
