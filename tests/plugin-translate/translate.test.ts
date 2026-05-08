import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslatePlugin } from '../../packages/@ux3/plugin-translate/src/index';

describe('TranslatePlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    delete (TranslatePlugin as any).config;
    mockApp = {
      config: {},
      registerService: vi.fn(),
      utils: {},
    };
  });

  it('has expected metadata', () => {
    expect(TranslatePlugin.name).toBe('@ux3/plugin-translate');
    expect(TranslatePlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('registers the translate service', () => {
    (TranslatePlugin as any).config = {
      endpoint: 'https://api.example.com/v1/chat/completions',
      model: 'gpt-4',
      apiKey: 'sk-test',
      defaultLocale: 'en',
      locales: ['en', 'fr', 'es'],
    };
    TranslatePlugin.install?.(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('translate', expect.any(Function));
  });

  it('exposes defaultLocale and locales on utils.translate', () => {
    (TranslatePlugin as any).config = {
      defaultLocale: 'en',
      locales: ['en', 'fr', 'de'],
    };
    TranslatePlugin.install?.(mockApp);
    expect((mockApp.utils as any).translate.defaultLocale).toBe('en');
    expect((mockApp.utils as any).translate.locales).toEqual(['en', 'fr', 'de']);
  });

  it('service.locale returns defaultLocale initially', () => {
    (TranslatePlugin as any).config = { defaultLocale: 'en', locales: ['en', 'fr'] };
    TranslatePlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();
    expect(service.locale).toBe('en');
  });

  it('service.setLocale changes the active locale', () => {
    (TranslatePlugin as any).config = { defaultLocale: 'en', locales: ['en', 'fr'] };
    TranslatePlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();
    // Provide a minimal locale service so setLocale delegates correctly
    let currentLocale = 'en';
    mockApp.locale = {
      setLocale(locale: string) { currentLocale = locale; },
      get locale() { return { primary: currentLocale, language: currentLocale }; },
    };
    service.setLocale('fr');
    expect(service.locale).toBe('fr');
  });

  it('service.setLocale throws for unsupported locale', () => {
    (TranslatePlugin as any).config = { defaultLocale: 'en', locales: ['en', 'fr'] };
    TranslatePlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();
    expect(() => service.setLocale('zh')).toThrow('@ux3/plugin-translate');
  });

  it('service.t returns original text when target equals defaultLocale', async () => {
    (TranslatePlugin as any).config = { defaultLocale: 'en', locales: ['en', 'fr'] };
    TranslatePlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();
    const result = await service.t('Hello', 'en');
    expect(result).toBe('Hello');
  });

  it('service.translate calls the API endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Bonjour' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    (TranslatePlugin as any).config = {
      endpoint: 'https://api.example.com/v1/chat/completions',
      model: 'gpt-4',
      apiKey: 'sk-test',
      defaultLocale: 'en',
      locales: ['en', 'fr'],
    };
    TranslatePlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();

    const result = await service.translate('Hello', 'fr');
    expect(result.translated).toBe('Bonjour');
    expect(result.target).toBe('fr');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );

    vi.unstubAllGlobals();
  });

  it('service.translate throws when API returns an error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal('fetch', mockFetch);

    (TranslatePlugin as any).config = {
      endpoint: 'https://api.example.com/v1/chat/completions',
      model: 'gpt-4',
      apiKey: 'bad-key',
      defaultLocale: 'en',
      locales: ['en', 'fr'],
    };
    TranslatePlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();

    await expect(service.translate('Hello', 'fr')).rejects.toThrow(
      '@ux3/plugin-translate'
    );

    vi.unstubAllGlobals();
  });
});
