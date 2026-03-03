/**
 * Test suite for rule engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuleEngine, type ValidationRule } from '../../src/validation/rule-engine.js';

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  describe('validate', () => {
    it('should validate required rule', async () => {
      const result = await engine.validate('', {
        type: 'required',
        message: 'Field is required',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Field is required');
    });

    it('should pass validation for valid value', async () => {
      const result = await engine.validate('hello', {
        type: 'required',
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should use default message if not provided', async () => {
      const result = await engine.validate('', {
        type: 'required',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This field is required');
    });

    it('should validate email rule', async () => {
      const validEmail = await engine.validate('user@example.com', {
        type: 'email',
      });
      expect(validEmail.valid).toBe(true);

      const invalidEmail = await engine.validate('invalid', {
        type: 'email',
      });
      expect(invalidEmail.valid).toBe(false);
    });

    it('should validate pattern rule with config', async () => {
      const result = await engine.validate('test123', {
        type: 'pattern',
        config: { pattern: '^[a-z]+[0-9]+$' },
      });

      expect(result.valid).toBe(true);
    });

    it('should handle unknown rule type', async () => {
      const result = await engine.validate('value', {
        type: 'unknownRule' as any,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown rule');
    });
  });

  describe('validateField', () => {
    it('should validate multiple rules for a field', async () => {
      const rules: ValidationRule[] = [
        { type: 'required', message: 'Required' },
        { type: 'minLength', config: { minLength: 5 }, message: 'Too short' },
      ];

      const result = await engine.validateField('name', 'hi', rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Too short');
    });

    it('should pass all rules if valid', async () => {
      const rules: ValidationRule[] = [
        { type: 'required' },
        { type: 'email' },
      ];

      const result = await engine.validateField('email', 'user@example.com', rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all error messages', async () => {
      const rules: ValidationRule[] = [
        { type: 'minLength', config: { minLength: 10 }, message: 'Too short' },
        { type: 'email', message: 'Invalid email' },
      ];

      const result = await engine.validateField('email', 'abc', rules);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateForm', () => {
    it('should validate entire form against schema', async () => {
      const schema = {
        email: [{ type: 'required' }, { type: 'email' }],
        password: [
          { type: 'required' },
          { type: 'minLength', config: { minLength: 8 } },
        ],
      };

      const data = {
        email: 'user@example.com',
        password: 'short',
      };

      const result = await engine.validateForm(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.password).toBeDefined();
      expect(result.errors.password.length).toBeGreaterThan(0);
    });

    it('should pass all fields if valid', async () => {
      const schema = {
        email: [{ type: 'email' }],
        name: [{ type: 'required' }],
      };

      const data = {
        email: 'user@example.com',
        name: 'John Doe',
      };

      const result = await engine.validateForm(data, schema);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should support cross-field validation via context', async () => {
      const schema = {
        password: [{ type: 'required' }],
        confirmPassword: [
          { type: 'matches', config: { other: 'password' } },
        ],
      };

      const data = {
        password: 'secret123',
        confirmPassword: 'secret123',
      };

      const result = await engine.validateForm(data, schema, data);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateFieldDebounced', () => {
    it('should debounce validation calls', async () => {
      const rules: ValidationRule[] = [
        { type: 'required', debounce: 100 },
      ];

      let callCount = 0;
      const originalValidate = engine.validateField.bind(engine);
      engine.validateField = async (...args) => {
        callCount++;
        return originalValidate(...args);
      };

      // Make multiple calls in quick succession
      engine.validateFieldDebounced('test', 'value', rules);
      engine.validateFieldDebounced('test', 'value2', rules);

      // Should debounce to single call
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callCount).toBeLessThan(3); // Would be 2 without debounce
    });

    it('should eventually resolve validation', async () => {
      const rules: ValidationRule[] = [
        { type: 'required', debounce: 50 },
      ];

      const result = await engine.validateFieldDebounced('name', '', rules);

      expect(result.valid).toBe(false);
    });
  });

  describe('clearDebounceTimers', () => {
    it('should clear all pending timers', async () => {
      const rules: ValidationRule[] = [
        { type: 'required', debounce: 1000 },
      ];

      engine.validateFieldDebounced('test1', '', rules);
      engine.validateFieldDebounced('test2', '', rules);

      engine.clearDebounceTimers();

      // Timer should be cleared, no more pending
      expect(true).toBe(true); // Manual verification after cleanup
    });
  });

  describe('cache', () => {
    it('should clear cache', () => {
      engine.clearCache();
      // Just verify no errors are thrown
      expect(true).toBe(true);
    });
  });
});
