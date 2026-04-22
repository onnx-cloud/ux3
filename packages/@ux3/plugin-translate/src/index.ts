import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

export interface TranslateConfig {
  /** OpenAI-compatible chat completions endpoint */
  endpoint?: string;
  /** Model identifier (e.g. 'openai/gpt-oss-120b') */
  model?: string;
  /**
   * Bearer token for the endpoint.
   *
   * ⚠️  Security note: this value is interpolated from the environment at build
   * time (`{{ env.GROQ_API_KEY }}`). It must NEVER be committed as a plain
   * secret.  When deploying to production, route translation requests through a
   * server-side proxy so the key is not exposed in the client bundle.
   */
  apiKey?: string;
  /** BCP-47 locale tag for the source language (default: 'en') */
  defaultLocale?: string;
  /** Supported target locale tags */
  locales?: string[];
}

export interface TranslationResult {
  source: string;
  target: string;
  translated: string;
}

function readConfig(app: any): TranslateConfig {
  return (
    (TranslatePlugin as any).config ??
    app.config?.plugins?.['@ux3/plugin-translate'] ??
    {}
  );
}

/**
 * Call an OpenAI-compatible chat completions endpoint to translate `text`.
 */
async function callTranslationApi(
  text: string,
  targetLocale: string,
  sourceLocale: string,
  cfg: TranslateConfig
): Promise<string> {
  const { endpoint, apiKey, model } = cfg;

  if (!endpoint || !model) {
    throw new Error('@ux3/plugin-translate: endpoint and model are required');
  }
  if (!apiKey) {
    throw new Error('@ux3/plugin-translate: apiKey is required');
  }

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content:
          `You are a professional translator. ` +
          `Translate the following text from ${sourceLocale} to ${targetLocale}. ` +
          `Return only the translated text with no additional commentary.`,
      },
      { role: 'user', content: text },
    ],
    max_tokens: 2048,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `@ux3/plugin-translate: API request failed – HTTP ${response.status}`
    );
  }

  const data = (await response.json()) as any;
  const translated: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!translated) {
    throw new Error('@ux3/plugin-translate: empty response from API');
  }
  return translated;
}

export const TranslatePlugin: Plugin = {
  name: '@ux3/plugin-translate',
  version,
  description: 'AI-powered translation service for UX3 (OpenAI-compatible endpoint)',

  install(app) {
    const cfg = readConfig(app);
    const defaultLocale = cfg.defaultLocale ?? 'en';
    const locales: string[] = cfg.locales ?? [defaultLocale];

    let currentLocale = defaultLocale;

    app.registerService?.('translate', () => ({
      /** Currently active locale */
      get locale(): string {
        return currentLocale;
      },

      /** All supported locale tags */
      get locales(): string[] {
        return locales;
      },

      /** Switch the active locale used for translation lookups */
      setLocale(locale: string): void {
        if (!locales.includes(locale)) {
          throw new Error(`@ux3/plugin-translate: unsupported locale '${locale}'`);
        }
        currentLocale = locale;
      },

      /**
       * Translate `text` from `sourceLocale` (defaults to `currentLocale`) into
       * `targetLocale`.
       */
      async translate(
        text: string,
        targetLocale: string,
        sourceLocale?: string
      ): Promise<TranslationResult> {
        const source = sourceLocale ?? currentLocale;
        const translated = await callTranslationApi(text, targetLocale, source, cfg);
        return { source, target: targetLocale, translated };
      },

      /**
       * Shorthand: translate `text` from the default locale into `targetLocale`
       * (defaults to `currentLocale`).  Returns the translated string directly.
       *
       * When `targetLocale === defaultLocale` the original text is returned
       * immediately without an API call.
       */
      async t(text: string, targetLocale?: string): Promise<string> {
        const target = targetLocale ?? currentLocale;
        if (target === defaultLocale) return text;
        const translated = await callTranslationApi(text, target, defaultLocale, cfg);
        return translated;
      },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).translate = { defaultLocale, locales };
  },
};

export default TranslatePlugin;
