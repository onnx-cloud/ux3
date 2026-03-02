import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeHtml, stripHtml, sanitizeUrl, sanitizeJson, generateCSP } from '../../src/security/sanitizer';

describe('Sanitizer', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toContain('&lt;');
    });

    it('handles ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('handles quotes', () => {
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });
  });

  describe('sanitizeHtml', () => {
    it('removes script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const output = sanitizeHtml(input) as string;
      expect(output).not.toContain('<script>');
    });

    it('removes onclick handlers', () => {
      const input = '<button onclick="alert(\'xss\')">Click</button>';
      const output = sanitizeHtml(input) as string;
      expect(output).not.toContain('onclick');
    });

    it('allows safe tags in moderate level', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeHtml(input, { level: 'moderate' }) as string;
      expect(output).toContain('<p>');
      expect(output).toContain('<strong>');
    });

    it('strips all HTML in strict level', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeHtml(input, { level: 'strict' }) as string;
      expect(output).not.toContain('<');
    });
  });

  describe('stripHtml', () => {
    it('removes all HTML tags', () => {
      expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
    });
  });

  describe('sanitizeUrl', () => {
    it('allows http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('allows https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('blocks javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBe('');
    });

    it('blocks data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBe('');
    });

    it('allows mailto:', () => {
      const result = sanitizeUrl('mailto:test@example.com');
      expect(result).toBe('mailto:test@example.com');
    });
  });

  describe('sanitizeJson', () => {
    it('escapes strings in objects', () => {
      const input = { message: '<script>alert("xss")</script>' };
      const output = sanitizeJson(input);
      expect(JSON.stringify(output)).toContain('&lt;');
    });

    it('handles nested objects', () => {
      const input = { user: { name: '<img onerror="alert(1)">' } };
      const output = sanitizeJson(input);
      expect(JSON.stringify(output)).toContain('&lt;');
    });

    it('prevents prototype pollution', () => {
      const input = { '__proto__': { polluted: true } };
      const output = sanitizeJson(input) as Record<string, unknown>;
      expect('__proto__' in output).toBe(false);
    });
  });

  describe('generateCSP', () => {
    it('generates CSP header', () => {
      const csp = generateCSP({
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"]
      });
      expect(csp).toContain('default-src');
      expect(csp).toContain('script-src');
    });
  });
});
