import type { Plugin } from '../../../../src/plugin/registry';
import { defaultLogger } from '../../../../src/security/observability.js';
export type { BuildTimeTranslateConfig, BuildTimeTranslateResult } from './build-time.js';

export interface I18nPluginConfig {
  /** Locale to activate on install. Defaults to document.documentElement.lang or 'en'. */
  locale?: string;
  /** Extra translation namespaces loaded from remote JSON URLs (keyed by prefix). */
  namespaces?: Record<string, string>;
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
  /** Override system prompts for translation requests */
  prompts?: {
    runtime?: { system?: string };
  };
}

export interface TranslationResult {
  source: string;
  target: string;
  translated: string;
}

/**
 * Wrap a pluralisation helper around app.i18n.
 * Pluralisation key convention: `key.one`, `key.other` (follows ICU subset).
 */
function pluralise(count: number, locale: string, key: string, i18nFn: (k: string) => string): string {
  const rules = new Intl.PluralRules(locale);
  const form = rules.select(count);
  // try `key.one` / `key.other` etc.; fall back to plain key
  return i18nFn(`${key}.${form}`) || i18nFn(key);
}

function readConfig(app: any): I18nPluginConfig {
  return (
    (I18nPlugin as any).config ??
    app.config?.plugins?.['@ux3/plugin-i18n'] ??
    app.config?.plugins?.i18n ??
    {}
  );
}

async function loadDotEnvIfPresent(): Promise<void> {
  if (typeof process === 'undefined' || typeof process.cwd !== 'function' || !process.env) {
    return;
  }

  try {
    const nodeFs = 'node:' + 'fs';
    const nodePath = 'node:' + 'path';
    const fs = await import(nodeFs);
    const path = await import(nodePath);
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      return;
    }

    const contents = fs.readFileSync(envPath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separator = trimmed.indexOf('=');
      if (separator < 0) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore if running in a non-Node environment.
  }
}

async function loadRuntimePrompt(cfg: I18nPluginConfig): Promise<string> {
  if (cfg.prompts?.runtime?.system) {
    return cfg.prompts.runtime.system;
  }

  try {
    const nodeFs = 'node:' + 'fs';
    const nodePath = 'node:' + 'path';
    const path = await import(nodePath);
    const fs = await import(nodeFs);
    const promptsPath = new URL('../prompts.json', import.meta.url).pathname;
    if (fs.existsSync(promptsPath)) {
      const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8')) as { runtime?: { system?: string } };
      if (prompts.runtime?.system) {
        return prompts.runtime.system;
      }
    }
  } catch {
    // fall through to default
  }

  return 'You are a professional translator. Translate the following text from {{sourceLocale}} to {{targetLocale}}. Return only the translated text with no additional commentary.';
}

async function resolveRuntimeConfig(cfg: I18nPluginConfig): Promise<Required<Pick<I18nPluginConfig, 'endpoint' | 'model' | 'apiKey'>>> {
  await loadDotEnvIfPresent();

  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env : {} as NodeJS.ProcessEnv;
  return {
    endpoint: cfg.endpoint || nodeEnv.GROQ_OPENAI_ENDPOINT || '',
    model: cfg.model || nodeEnv.GROQ_MODEL || '',
    apiKey: cfg.apiKey || nodeEnv.GROQ_API_KEY || '',
  };
}

/**
 * Call an OpenAI-compatible chat completions endpoint to translate `text`.
 */
async function callTranslationApi(
  text: string,
  targetLocale: string,
  sourceLocale: string,
  cfg: I18nPluginConfig
): Promise<string> {
  const { endpoint, apiKey, model } = cfg;

  if (!endpoint || !model) {
    throw new Error('@ux3/plugin-i18n: endpoint and model are required for translation');
  }
  if (!apiKey) {
    throw new Error('@ux3/plugin-i18n: apiKey is required for translation');
  }

  const promptTemplate = await loadRuntimePrompt(cfg);
  const systemContent = promptTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'sourceLocale') return sourceLocale;
    if (key === 'targetLocale') return targetLocale;
    return `{{${key}}}`;
  });

  defaultLogger.info('@ux3/plugin-i18n.translate.request', {
    sourceLocale,
    targetLocale,
    endpoint,
    model,
  });

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemContent },
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
    const error = new Error(
      `@ux3/plugin-i18n: API request failed – HTTP ${response.status}`
    );
    defaultLogger.error('@ux3/plugin-i18n.translate.failure', error, {
      sourceLocale,
      targetLocale,
      endpoint,
      model,
      status: response.status,
    });
    throw error;
  }

  const data = (await response.json()) as any;
  const translated: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!translated) {
    const error = new Error('@ux3/plugin-i18n: empty response from API');
    defaultLogger.error('@ux3/plugin-i18n.translate.failure', error, {
      sourceLocale,
      targetLocale,
      endpoint,
      model,
    });
    throw error;
  }

  defaultLogger.info('@ux3/plugin-i18n.translate.success', {
    sourceLocale,
    targetLocale,
    endpoint,
    model,
    translatedLength: translated.length,
  });
  return translated;
}

export const I18nPlugin: Plugin = {
  name: '@ux3/plugin-i18n',
  version: '0.1.0',
  description: 'Unified i18n and AI-powered translation plugin with pluralisation and remote namespace loading',
  install(app) {
    const cfg = readConfig(app);
    const locale =
      cfg.locale ||
      (typeof document !== 'undefined' ? document.documentElement.lang : '') ||
      'en';

    const orig = app.i18n.bind(app);

    // expose pluralise as a util
    (app as any).utils = (app as any).utils || {};
    (app as any).utils.pluralise = (key: string, count: number) =>
      pluralise(count, locale, key, (k) => orig(k));

    // load remote namespaces asynchronously (non-blocking)
    if (cfg.namespaces) {
      for (const [prefix, url] of Object.entries(cfg.namespaces)) {
        fetch(url)
          .then((r) => r.json())
          .then((data: Record<string, string>) => {
            // merge into app i18n by overriding the lookup function to
            // check namespace keys first
            const ns: Record<string, string> = {};
            for (const [k, v] of Object.entries(data)) {
              ns[`${prefix}.${k}`] = v;
            }
            const prevI18n = app.i18n.bind(app);
            app.i18n = (key: string, props?: Record<string, any>) =>
              ns[key] ?? prevI18n(key, props);
          })
          .catch((err) => {
            console.warn(`[@ux3/plugin-i18n] failed to load namespace '${prefix}' from ${url}`, err);
          });
      }
    }

    // Register translation service (for LLM-powered runtime translation)
    const defaultLocale = cfg.defaultLocale ?? 'en';
    const locales: string[] = cfg.locales ?? [defaultLocale];

    app.registerService?.('translate', () => {
      const resolveLocale = (): string => {
        const serviceLocale = (app as any).locale?.locale?.primary;
        if (serviceLocale && locales.includes(serviceLocale)) return serviceLocale;
        const lang = (app as any).locale?.locale?.language;
        if (lang && locales.includes(lang)) return lang;
        return defaultLocale;
      };

      return {
        /** Currently active locale — derived from the canonical locale service */
        get locale(): string {
          return resolveLocale();
        },

        /** All supported locale tags */
        get locales(): string[] {
          return locales;
        },

        /** Switch the active locale via the canonical locale service */
        setLocale(locale: string): void {
          if (!locales.includes(locale)) {
            throw new Error(`@ux3/plugin-i18n: unsupported locale '${locale}'`);
          }
          const svc = (app as any).locale;
          if (svc && typeof svc.setLocale === 'function') {
            svc.setLocale(locale);
          }
        },

        /**
         * Translate `text` from `sourceLocale` (defaults to the active locale)
         * into `targetLocale`.
         */
        async translate(
          text: string,
          targetLocale: string,
          sourceLocale?: string
        ): Promise<TranslationResult> {
          const source = sourceLocale ?? resolveLocale();
          const resolvedCfg = await resolveRuntimeConfig(cfg);
          const translated = await callTranslationApi(text, targetLocale, source, resolvedCfg);
          return { source, target: targetLocale, translated };
        },

        /**
         * Shorthand: translate `text` from the default locale into `targetLocale`
         * (defaults to the active locale).  Returns the translated string directly.
         *
         * When `targetLocale === defaultLocale` the original text is returned
         * immediately without an API call.
         */
        async t(text: string, targetLocale?: string): Promise<string> {
          const target = targetLocale ?? resolveLocale();
          if (target === defaultLocale) return text;
          const resolvedCfg = await resolveRuntimeConfig(cfg);
          const translated = await callTranslationApi(text, target, defaultLocale, resolvedCfg);
          return translated;
        },
      };
    });

    (app as any).utils = (app as any).utils ?? {};
    (app.utils as any).translate = { defaultLocale, locales };
  },
};

export default I18nPlugin;
