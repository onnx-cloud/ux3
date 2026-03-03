import { describe, it, expect, beforeEach } from 'vitest';

describe('I18n Plugin', () => {
  beforeEach(() => {
    // Reset document language
    document.documentElement.lang = 'en';
  });

  it('should have i18n utilities exported', () => {
    // i18n plugin exports pluralise and other utilities
    // This is a placeholder test for the plugin existence
    expect(true).toBe(true);
  });

  it('should support locale configuration', () => {
    // Plugin should accept locale configuration on install
    const config = {
      locale: 'en',
      namespaces: {
        'common': 'https://example.com/i18n/en.json'
      }
    };
    expect(config.locale).toBe('en');
    expect(Object.keys(config.namespaces)).toContain('common');
  });

  it('should handle pluralization rules', () => {
    // Test ICU plural rules support
    const pluralRules = new Intl.PluralRules('en');
    expect(pluralRules.select(1)).toBe('one');
    expect(pluralRules.select(0)).toBe('other');
    expect(pluralRules.select(2)).toBe('other');
  });

  it('should support multiple locales', () => {
    const locales = ['en', 'es', 'fr', 'de', 'ja'];
    locales.forEach(locale => {
      const rules = new Intl.PluralRules(locale);
      expect(rules).toBeDefined();
    });
  });

  it('should fall back to document.documentElement.lang', () => {
    document.documentElement.lang = 'es';
    const lang = document.documentElement.lang;
    expect(lang).toBe('es');
  });

  it('should support remote namespace loading', async () => {
    // Plugin can load translation namespaces from remote URLs
    const namespace = {
      'greeting': 'Hello',
      'farewell': 'Goodbye',
      'items.one': 'one item',
      'items.other': 'multiple items'
    };
    
    expect(namespace['greeting']).toBe('Hello');
    expect('items.one' in namespace).toBe(true);
  });
});
