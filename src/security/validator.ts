/**
 * Input validation and sanitization
 * Follows OWASP Top 10 #1: Broken Access Control, #3: Injection
 */

export interface InputValidationRule {
  type: 'string' | 'email' | 'url' | 'number' | 'integer' | 'boolean' | 'date';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: string[] | number[];
  custom?: (value: unknown) => boolean | Promise<boolean>;
}

/** Backward compatibility alias */
export type ValidationRule = InputValidationRule;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class InputValidator {
  /**
   * Validates a single value against a rule
   */
  static async validate(value: unknown, rule: InputValidationRule): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check required
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push('Field is required');
      return { valid: false, errors };
    }

    if (!rule.required && (value === null || value === undefined || value === '')) {
      return { valid: true, errors };
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push('Must be a string');
        } else {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(`Minimum length is ${rule.minLength}`);
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`Maximum length is ${rule.maxLength}`);
          }
        }
        break;

      case 'email':
        if (typeof value !== 'string') {
          errors.push('Must be a string');
        } else if (!this.isValidEmail(value)) {
          errors.push('Invalid email address');
        }
        break;

      case 'url':
        if (typeof value !== 'string') {
          errors.push('Must be a string');
        } else if (!this.isValidUrl(value)) {
          errors.push('Invalid URL');
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push('Must be a number');
        } else {
          if (rule.min !== undefined && value < rule.min) {
            errors.push(`Minimum value is ${rule.min}`);
          }
          if (rule.max !== undefined && value > rule.max) {
            errors.push(`Maximum value is ${rule.max}`);
          }
        }
        break;

      case 'integer':
        if (!Number.isInteger(value)) {
          errors.push('Must be an integer');
        } else {
          if (rule.min !== undefined && (value as number) < rule.min) {
            errors.push(`Minimum value is ${rule.min}`);
          }
          if (rule.max !== undefined && (value as number) > rule.max) {
            errors.push(`Maximum value is ${rule.max}`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push('Must be a boolean');
        }
        break;

      case 'date':
        if (!(value instanceof Date)) {
          errors.push('Must be a date');
        }
        break;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push(`Must match pattern: ${rule.pattern}`);
      }
    }

    // Allowed values
    if (rule.allowedValues && !rule.allowedValues.includes(value as string & number)) {
      errors.push(`Value must be one of: ${rule.allowedValues.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      try {
        const isValid = await rule.custom(value);
        if (!isValid) {
          errors.push('Custom validation failed');
        }
      } catch (err) {
        errors.push('Validation error');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates an object against a schema
   */
  static async validateObject(
    data: Record<string, unknown>,
    schema: Record<string, InputValidationRule>
  ): Promise<{ valid: boolean; fieldErrors: Record<string, string[]> }> {
    const fieldErrors: Record<string, string[]> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const result = await this.validate(data[field], rule);
      if (!result.valid) {
        fieldErrors[field] = result.errors;
      }
    }

    return {
      valid: Object.keys(fieldErrors).length === 0,
      fieldErrors
    };
  }

  /**
   * Email validation using RFC 5322 simplified regex
   */
  private static isValidEmail(email: string): boolean {
    // Simplified email validation - in production use a library like email-validator
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * URL validation
   */
  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'ftp:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();

  /**
   * Generates a CSRF token
   */
  static generateToken(sessionId: string, expiresIn: number = 3600000): string {
    const token = this.randomToken();
    const expires = Date.now() + expiresIn;
    this.tokens.set(sessionId, { token, expires });
    return token;
  }

  /**
   * Validates a CSRF token
   */
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }

    return stored.token === token;
  }

  /**
   * Clears expired tokens
   */
  static clearExpired(): void {
    const now = Date.now();
    for (const [sessionId, { expires }] of this.tokens.entries()) {
      if (now > expires) {
        this.tokens.delete(sessionId);
      }
    }
  }

  private static randomToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Rate limiting to prevent brute force attacks
 */
export class RateLimiter {
  private attempts = new Map<string, number[]>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 100, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Checks if a request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let attempts = this.attempts.get(key) || [];
    attempts = attempts.filter(timestamp => timestamp > windowStart);

    if (attempts.length >= this.maxAttempts) {
      return false;
    }

    attempts.push(now);
    this.attempts.set(key, attempts);
    return true;
  }

  /**
   * Gets remaining attempts for a key
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter(timestamp => timestamp > windowStart).length;
    
    return Math.max(0, this.maxAttempts - validAttempts);
  }
}
