import { describe, it, expect } from 'vitest';
import { validate } from '@ux3/plugin-validation';

describe('ValidationPlugin', () => {
  describe('validate function', () => {
    it('should validate required field', () => {
      const result = validate({ required: true }, 'value');
      expect(result).toBeNull(); // null means valid
    });

    it('should reject empty required field', () => {
      const result = validate({ required: true }, '');
      expect(result).toBeTruthy(); // Should return error message
    });

    it('should validate minimum length', () => {
      const result = validate({ minLength: 3 }, 'hello');
      expect(result).toBeNull();
    });

    it('should reject value below minimum length', () => {
      const result = validate({ minLength: 3 }, 'hi');
      expect(result).toBeTruthy();
    });

    it('should validate maximum length', () => {
      const result = validate({ maxLength: 10 }, 'hello');
      expect(result).toBeNull();
    });

    it('should reject value exceeding maximum length', () => {
      const result = validate({ maxLength: 5 }, 'hello world');
      expect(result).toBeTruthy();
    });

    it('should validate email format', () => {
      const validEmail = validate({ email: true }, 'user@example.com');
      expect(validEmail).toBeNull();
    });

    it('should reject invalid email format', () => {
      const result = validate({ email: true }, 'invalid.email');
      expect(result).toBeTruthy();
    });

    it('should validate URL format', () => {
      const result = validate({ url: true }, 'https://example.com');
      expect(result).toBeNull();
    });

    it('should reject invalid URL format', () => {
      const result = validate({ url: true }, 'not a url');
      expect(result).toBeTruthy();
    });

    it('should validate pattern matching', () => {
      const result = validate({ pattern: /^\d{3}-\d{4}$/ }, '123-4567');
      expect(result).toBeNull();
    });

    it('should reject pattern mismatch', () => {
      const result = validate({ pattern: /^\d{3}-\d{4}$/ }, 'abc-defg');
      expect(result).toBeTruthy();
    });

    it('should handle string patterns', () => {
      const result = validate({ pattern: '^[a-z]+$' }, 'hello');
      expect(result).toBeNull();
    });

    it('should validate multiple rules', () => {
      const result = validate(
        { required: true, minLength: 3, maxLength: 10 },
        'hello'
      );
      expect(result).toBeNull();
    });

    it('should fail on first invalid rule', () => {
      const result = validate(
        { required: true, minLength: 10 },
        'hi'
      );
      expect(result).toBeTruthy();
    });

    it('should handle custom rules', () => {
      const result = validate(
        { custom: (val: any) => val === 'magic' ? null : 'Must be magic' },
        'magic'
      );
      expect(result).toBeNull();
    });

    it('should handle null and undefined values', () => {
      const resultNull = validate({ required: false }, null);
      const resultUndef = validate({ required: false }, undefined);
      expect(resultNull).toBeNull();
      expect(resultUndef).toBeNull();
    });

    it('should coerce value to string for validation', () => {
      const result = validate({ minLength: 1 }, 123);
      expect(result).toBeNull();
    });

    it('should trim whitespace for required validation', () => {
      const result = validate({ required: true }, '   ');
      expect(result).toBeTruthy();
    });
  });
});
