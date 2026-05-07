import { describe, it, expect } from 'vitest';
import { applyBuildTimeTranslation } from '../../packages/@ux3/plugin-translate/src/build-time';

describe('@ux3/plugin-translate build-time', () => {
  it('translates missing locales from source locale', async () => {
    const config: any = {
      i18n: {
        en: {
          title: 'Hello',
          nested: {
            label: 'Welcome',
          },
        },
      },
    };

    const calls: string[] = [];
    const result = await applyBuildTimeTranslation(
      config,
      {
        apiKey: 'test-key',
        sourceLocale: 'en',
        locales: ['fr', 'de'],
      },
      {
        translateFn: async (text, locale) => {
          calls.push(`${locale}:${text}`);
          return `${text} [${locale}]`;
        },
      }
    );

    expect(result).not.toBeNull();
    expect(result?.targetLocales).toEqual(['fr', 'de']);
    expect(config.i18n.fr.title).toBe('Hello [fr]');
    expect(config.i18n.fr.nested.label).toBe('Welcome [fr]');
    expect(config.i18n.de.title).toBe('Hello [de]');
    expect(calls).toContain('fr:Hello');
    expect(calls).toContain('de:Welcome');
  });

  it('does not overwrite existing strings unless overwrite is true', async () => {
    const config: any = {
      i18n: {
        en: {
          title: 'Hello',
          subtitle: 'World',
        },
        fr: {
          title: 'Bonjour',
        },
      },
    };

    await applyBuildTimeTranslation(
      config,
      {
        apiKey: 'test-key',
        sourceLocale: 'en',
        locales: ['fr'],
      },
      {
        translateFn: async (text, locale) => `${text} [${locale}]`,
      }
    );

    expect(config.i18n.fr.title).toBe('Bonjour');
    expect(config.i18n.fr.subtitle).toBe('World [fr]');

    await applyBuildTimeTranslation(
      config,
      {
        apiKey: 'test-key',
        sourceLocale: 'en',
        locales: ['fr'],
        overwrite: true,
      },
      {
        translateFn: async (text, locale) => `${text} [${locale}]`,
      }
    );

    expect(config.i18n.fr.title).toBe('Hello [fr]');
  });

  it('throws when source locale does not exist', async () => {
    const config: any = {
      i18n: {
        en: {
          title: 'Hello',
        },
      },
    };

    await expect(
      applyBuildTimeTranslation(config, {
        apiKey: 'test-key',
        sourceLocale: 'es',
        locales: ['fr'],
      })
    ).rejects.toThrow("source locale 'es' not found");
  });
});
