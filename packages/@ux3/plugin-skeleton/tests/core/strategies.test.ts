import { describe, it, expect } from 'vitest';
import { defaultCasingStrategy, defaultFileFilter } from '../../src/core/strategies';

describe('strategies', () => {
  describe('defaultCasingStrategy', () => {
    it('converts to kebab, PascalCase, snake_case, UPPER_SNAKE', () => {
      const result = defaultCasingStrategy('my-view');
      expect(result.name).toBe('my-view');
      expect(result.Name).toBe('MyView');
      expect(result.name_snake).toBe('my_view');
      expect(result.NAME).toBe('MY_VIEW');
    });

    it('handles already-cased input', () => {
      const result = defaultCasingStrategy('MyView');
      expect(result.name).toBe('my-view');
      expect(result.Name).toBe('MyView');
      expect(result.name_snake).toBe('my_view');
      expect(result.NAME).toBe('MY_VIEW');
    });

    it('handles spaces and underscores', () => {
      const result = defaultCasingStrategy('my_complex_name');
      expect(result.name).toBe('my-complex-name');
      expect(result.Name).toBe('MyComplexName');
    });
  });

  describe('defaultFileFilter', () => {
    it('includes normal files', () => {
      expect(defaultFileFilter('src/index.ts')).toBe(true);
      expect(defaultFileFilter('package.json')).toBe(true);
    });

    it('excludes HINTS.md', () => {
      expect(defaultFileFilter('HINTS.md')).toBe(false);
      expect(defaultFileFilter('path/to/HINTS.md')).toBe(false);
    });
  });
});
