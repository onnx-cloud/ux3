import { describe, it, expect, beforeEach } from 'vitest';
import { InputValidator, CSRFProtection, RateLimiter } from '../../src/security/validator';

describe('InputValidator', () => {
  describe('validate', () => {
    it('validates required string', async () => {
      const result = await InputValidator.validate('hello', { type: 'string', required: true });
      expect(result.valid).toBe(true);
    });

    it('rejects empty required field', async () => {
      const result = await InputValidator.validate('', { type: 'string', required: true });
      expect(result.valid).toBe(false);
    });

    it('validates string length', async () => {
      const result = await InputValidator.validate('hello', {
        type: 'string',
        minLength: 3,
        maxLength: 10
      });
      expect(result.valid).toBe(true);
    });

    it('rejects string too short', async () => {
      const result = await InputValidator.validate('hi', {
        type: 'string',
        minLength: 3
      });
      expect(result.valid).toBe(false);
    });

    it('validates email', async () => {
      const result = await InputValidator.validate('test@example.com', { type: 'email' });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid email', async () => {
      const result = await InputValidator.validate('invalid-email', { type: 'email' });
      expect(result.valid).toBe(false);
    });

    it('validates URL', async () => {
      const result = await InputValidator.validate('https://example.com', { type: 'url' });
      expect(result.valid).toBe(true);
    });

    it('validates number range', async () => {
      const result = await InputValidator.validate(5, {
        type: 'number',
        min: 0,
        max: 10
      });
      expect(result.valid).toBe(true);
    });

    it('validates pattern', async () => {
      const result = await InputValidator.validate('ABC123', {
        type: 'string',
        pattern: /^[A-Z]+\d+$/
      });
      expect(result.valid).toBe(true);
    });

    it('validates allowed values', async () => {
      const result = await InputValidator.validate('red', {
        type: 'string',
        allowedValues: ['red', 'green', 'blue']
      });
      expect(result.valid).toBe(true);
    });

    it('custom validation', async () => {
      const result = await InputValidator.validate('test', {
        type: 'string',
        custom: (value) => (value as string).startsWith('t')
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateObject', () => {
    it('validates object against schema', async () => {
      const data = { name: 'John', email: 'john@example.com', age: 30 };
      const schema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
        age: { type: 'number' as const, min: 0, max: 150 }
      };

      const result = await InputValidator.validateObject(data, schema);
      expect(result.valid).toBe(true);
    });

    it('reports field errors', async () => {
      const data = { name: '', email: 'invalid' };
      const schema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true }
      };

      const result = await InputValidator.validateObject(data, schema);
      expect(result.valid).toBe(false);
      expect(result.fieldErrors.name).toBeDefined();
      expect(result.fieldErrors.email).toBeDefined();
    });
  });
});

describe('CSRFProtection', () => {
  beforeEach(() => {
    // Reset tokens before each test
    CSRFProtection.clearExpired();
  });

  it('generates CSRF token', () => {
    const token = CSRFProtection.generateToken('session123');
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);
  });

  it('validates correct token', () => {
    const token = CSRFProtection.generateToken('session123');
    const isValid = CSRFProtection.validateToken('session123', token);
    expect(isValid).toBe(true);
  });

  it('rejects wrong token', () => {
    CSRFProtection.generateToken('session123');
    const isValid = CSRFProtection.validateToken('session123', 'wrong_token');
    expect(isValid).toBe(false);
  });

  it('rejects token from different session', () => {
    const token = CSRFProtection.generateToken('session123');
    const isValid = CSRFProtection.validateToken('session456', token);
    expect(isValid).toBe(false);
  });
});

describe('RateLimiter', () => {
  it('allows requests within limit', () => {
    const limiter = new RateLimiter(10, 60000);
    
    for (let i = 0; i < 10; i++) {
      expect(limiter.isAllowed('user123')).toBe(true);
    }
  });

  it('blocks requests exceeding limit', () => {
    const limiter = new RateLimiter(3, 60000);
    
    expect(limiter.isAllowed('user123')).toBe(true);
    expect(limiter.isAllowed('user123')).toBe(true);
    expect(limiter.isAllowed('user123')).toBe(true);
    expect(limiter.isAllowed('user123')).toBe(false);
  });

  it('tracks remaining attempts', () => {
    const limiter = new RateLimiter(5, 60000);
    
    limiter.isAllowed('user123');
    limiter.isAllowed('user123');
    
    expect(limiter.getRemaining('user123')).toBe(3);
  });
});
