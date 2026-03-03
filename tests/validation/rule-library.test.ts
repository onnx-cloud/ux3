/**
 * Test suite for rule library
 */

import { describe, it, expect } from 'vitest';
import { rules } from '../../src/validation/rule-library.js';

describe('Rule Library', () => {
  describe('required', () => {
    it('should return false for empty string', () => {
      expect(rules.required('')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(rules.required(null)).toBe(false);
      expect(rules.required(undefined)).toBe(false);
    });

    it('should return true for non-empty string', () => {
      expect(rules.required('hello')).toBe(true);
    });

    it('should return true for non-empty array', () => {
      expect(rules.required([1, 2, 3])).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(rules.required([])).toBe(false);
    });
  });

  describe('minLength', () => {
    it('should validate minimum string length', () => {
      expect(rules.minLength('hello', { minLength: 3 })).toBe(true);
      expect(rules.minLength('hi', { minLength: 3 })).toBe(false);
    });

    it('should return true for empty strings', () => {
      expect(rules.minLength('', { minLength: 5 })).toBe(true);
    });

    it('should validate array length', () => {
      expect(rules.minLength([1, 2, 3], { minLength: 2 })).toBe(true);
      expect(rules.minLength([1], { minLength: 2 })).toBe(false);
    });
  });

  describe('maxLength', () => {
    it('should validate maximum string length', () => {
      expect(rules.maxLength('hello', { maxLength: 10 })).toBe(true);
      expect(rules.maxLength('hello', { maxLength: 3 })).toBe(false);
    });

    it('should validate array length', () => {
      expect(rules.maxLength([1, 2, 3], { maxLength: 5 })).toBe(true);
      expect(rules.maxLength([1, 2, 3], { maxLength: 2 })).toBe(false);
    });
  });

  describe('min', () => {
    it('should validate minimum numeric value', () => {
      expect(rules.min(10, { min: 5 })).toBe(true);
      expect(rules.min(3, { min: 5 })).toBe(false);
    });

    it('should return true for empty values', () => {
      expect(rules.min('', { min: 5 })).toBe(true);
      expect(rules.min(null, { min: 5 })).toBe(true);
    });
  });

  describe('max', () => {
    it('should validate maximum numeric value', () => {
      expect(rules.max(5, { max: 10 })).toBe(true);
      expect(rules.max(15, { max: 10 })).toBe(false);
    });
  });

  describe('email', () => {
    it('should validate valid email addresses', () => {
      expect(rules.email('user@example.com')).toBe(true);
      expect(rules.email('test.user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(rules.email('invalid')).toBe(false);
      expect(rules.email('invalid@')).toBe(false);
      expect(rules.email('@example.com')).toBe(false);
    });

    it('should return true for empty strings', () => {
      expect(rules.email('')).toBe(true);
    });
  });

  describe('url', () => {
    it('should validate valid URLs', () => {
      expect(rules.url('https://example.com')).toBe(true);
      expect(rules.url('http://example.com')).toBe(true);
      expect(rules.url('ftp://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(rules.url('not a url')).toBe(false);
      expect(rules.url('example.com')).toBe(false);
    });
  });

  describe('pattern', () => {
    it('should validate string pattern', () => {
      expect(rules.pattern('test', { pattern: /^test/ })).toBe(true);
      expect(rules.pattern('test', { pattern: /^hello/ })).toBe(false);
    });

    it('should support string regex pattern', () => {
      expect(rules.pattern('123abc', { pattern: '^[0-9]' })).toBe(true);
      expect(rules.pattern('abc123', { pattern: '^[0-9]' })).toBe(false);
    });
  });

  describe('integer', () => {
    it('should validate integers', () => {
      expect(rules.integer(42)).toBe(true);
      expect(rules.integer('42')).toBe(true);
    });

    it('should reject non-integers', () => {
      expect(rules.integer(3.14)).toBe(false);
      expect(rules.integer('3.14')).toBe(false);
    });
  });

  describe('number', () => {
    it('should validate numbers', () => {
      expect(rules.number(42)).toBe(true);
      expect(rules.number(3.14)).toBe(true);
      expect(rules.number('42')).toBe(true);
    });

    it('should reject non-numbers', () => {
      expect(rules.number('abc')).toBe(false);
    });
  });

  describe('date', () => {
    it('should validate valid dates', () => {
      expect(rules.date('2024-01-01')).toBe(true);
      expect(rules.date(new Date())).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(rules.date('not a date')).toBe(false);
    });
  });

  describe('matches', () => {
    it('should validate matching fields', () => {
      const context = { password: 'secret123' };
      expect(rules.matches('secret123', { other: 'password' }, context)).toBe(true);
      expect(rules.matches('wrong', { other: 'password' }, context)).toBe(false);
    });
  });

  describe('custom', () => {
    it('should validate with custom function', () => {
      const validator = (v: any) => v.length > 5;
      expect(rules.custom('hello!', { validator })).toBe(true);
      expect(rules.custom('hi', { validator })).toBe(false);
    });
  });
});
