import type { GeneratedConfig } from '@ux3/ui/context-builder.js';
import { defaultLogger } from '@ux3/security/observability.js';
import fs from 'node:fs';
import path from 'node:path';

const process = (globalThis as any).process as {
  cwd(): string;
  env: Record<string, string | undefined>;
};

export interface BuildTimeTranslateConfig {
  enabled?: boolean;
  endpoint?: string;
  model?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  endpointEnv?: string;
  modelEnv?: string;
  sourceLocale?: string;
  locales?: string[];
  overwrite?: boolean;
  parallel?: boolean;
}

export interface BuildTimeTranslateResult {
  sourceLocale: string;
  targetLocales: string[];
  translatedKeys: number;
}

type TranslateFn = (
  text: string,
  targetLocale: string,
  sourceLocale: string,
  options: { endpoint: string; model: string; apiKey: string }
) => Promise<string>;

const DEFAULT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
let envLoaded = false;

export function loadDotEnvIfPresent(): void {
  if (envLoaded) {
    return;
  }

  envLoaded = true;
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
}

async function callTranslationApi(
  text: string,
  targetLocale: string,
  sourceLocale: string,
  options: { endpoint: string; model: string; apiKey: string }
): Promise<string> {
  const body = JSON.stringify({
    model: options.model,
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

  defaultLogger.info('@ux3/plugin-translate.buildTime.translate.request', {
    sourceLocale,
    targetLocale,
    endpoint: options.endpoint,
    model: options.model,
  });

  const response = await fetch(options.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    let responseDetails = '';
    try {
      const raw = (await response.text()).trim();
      if (raw) {
        const normalized = raw.replace(/\s+/g, ' ').slice(0, 240);
        responseDetails = `: ${normalized}`;
      }
    } catch {
      // ignore response parsing errors and keep the status-focused message
    }

    const errorMessage = response.status === 401 || response.status === 403
      ? `@ux3/plugin-translate: build-time API request failed - HTTP ${response.status}. Check credentials in 'apiKey' or the env var '${process.env.GROQ_API_KEY ? 'GROQ_API_KEY' : 'GROQ_API_KEY (default)'}'. To silence this in dev, disable build-time translation with plugins.@ux3/plugin-translate.config.enabled=false${responseDetails}`
      : `@ux3/plugin-translate: build-time API request failed - HTTP ${response.status}${responseDetails}`;

    const error = new Error(errorMessage);
    defaultLogger.error('@ux3/plugin-translate.buildTime.translate.failure', error, {
      sourceLocale,
      targetLocale,
      endpoint: options.endpoint,
      model: options.model,
      status: response.status,
    });
    throw error;
  }

  const data = (await response.json()) as any;
  const translated: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!translated) {
    const error = new Error('@ux3/plugin-translate: build-time API returned empty text');
    defaultLogger.error('@ux3/plugin-translate.buildTime.translate.failure', error, {
      sourceLocale,
      targetLocale,
      endpoint: options.endpoint,
      model: options.model,
    });
    throw error;
  }

  defaultLogger.info('@ux3/plugin-translate.buildTime.translate.success', {
    sourceLocale,
    targetLocale,
    endpoint: options.endpoint,
    model: options.model,
    translatedLength: translated.length,
  });

  return translated;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveTargets(
  cfg: BuildTimeTranslateConfig,
  sourceLocale: string,
  i18n: Record<string, Record<string, string>>
): string[] {
  if (Array.isArray(cfg.locales) && cfg.locales.length > 0) {
    return cfg.locales.filter((locale) => locale && locale !== sourceLocale);
  }

  const fromConfig = Object.keys(i18n).filter((locale) => locale !== sourceLocale);
  return fromConfig;
}

function getSourceLocale(cfg: BuildTimeTranslateConfig, i18n: Record<string, Record<string, string>>): string {
  if (cfg.sourceLocale && cfg.sourceLocale.length > 0) {
    return cfg.sourceLocale;
  }
  if (i18n.en) {
    return 'en';
  }
  const firstLocale = Object.keys(i18n)[0];
  return firstLocale || 'en';
}

async function translateObject(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  sourceLocale: string,
  targetLocale: string,
  options: {
    overwrite: boolean;
    translateFn: TranslateFn;
    client: { endpoint: string; model: string; apiKey: string };
  }
): Promise<number> {
  let translatedKeys = 0;

  const entries = Object.entries(source);
  for (const [key, sourceValue] of entries) {
    const existing = target[key];

    if (typeof sourceValue === 'string') {
      if (!options.overwrite && typeof existing === 'string' && existing.trim().length > 0) {
        continue;
      }

      target[key] = await options.translateFn(sourceValue, targetLocale, sourceLocale, options.client);
      translatedKeys += 1;
      continue;
    }

    if (Array.isArray(sourceValue)) {
      if (!options.overwrite && Array.isArray(existing) && existing.length > 0) {
        continue;
      }
      target[key] = sourceValue.slice();
      continue;
    }

    if (isRecord(sourceValue)) {
      const nestedTarget = isRecord(existing) ? existing : {};
      target[key] = nestedTarget;
      translatedKeys += await translateObject(sourceValue, nestedTarget, sourceLocale, targetLocale, options);
      continue;
    }

    if (options.overwrite || typeof existing === 'undefined') {
      target[key] = sourceValue;
    }
  }

  return translatedKeys;
}

export async function applyBuildTimeTranslation(
  config: GeneratedConfig,
  pluginConfig: BuildTimeTranslateConfig,
  deps: { translateFn?: TranslateFn } = {}
): Promise<BuildTimeTranslateResult | null> {
  if (pluginConfig.enabled === false) {
    return null;
  }

  loadDotEnvIfPresent();

  const i18n = (config.i18n || {}) as Record<string, Record<string, string>>;
  const sourceLocale = getSourceLocale(pluginConfig, i18n);
  const source = i18n[sourceLocale];
  if (!source || Object.keys(source).length === 0) {
    throw new Error(
      `@ux3/plugin-translate: build-time source locale '${sourceLocale}' not found in config.i18n`
    );
  }

  const endpoint =
    pluginConfig.endpoint ||
    process.env[pluginConfig.endpointEnv || 'GROQ_OPENAI_ENDPOINT'] ||
    DEFAULT_ENDPOINT;
  const model =
    pluginConfig.model ||
    process.env[pluginConfig.modelEnv || 'GROQ_MODEL'] ||
    DEFAULT_MODEL;
  const apiKey =
    pluginConfig.apiKey ||
    process.env[pluginConfig.apiKeyEnv || 'GROQ_API_KEY'] ||
    '';

  if (!apiKey) {
    throw new Error(
      '@ux3/plugin-translate: build-time apiKey is required (set config.apiKey or env GROQ_API_KEY)'
    );
  }

  const targetLocales = resolveTargets(pluginConfig, sourceLocale, i18n);
  if (targetLocales.length === 0) {
    return {
      sourceLocale,
      targetLocales: [],
      translatedKeys: 0,
    };
  }

  const overwrite = pluginConfig.overwrite === true;
  const translateFn = deps.translateFn || callTranslationApi;
  const parallel = pluginConfig.parallel !== false;

  const translateLocale = async (locale: string): Promise<number> => {
    const target = (i18n[locale] ?? {}) as Record<string, unknown>;
    i18n[locale] = target as Record<string, string>;

    return translateObject(source as Record<string, unknown>, target, sourceLocale, locale, {
      overwrite,
      translateFn,
      client: { endpoint, model, apiKey },
    });
  };

  const localeResults = parallel
    ? await Promise.all(targetLocales.map((locale) => translateLocale(locale)))
    : await (async () => {
        const counts: number[] = [];
        for (const locale of targetLocales) {
          counts.push(await translateLocale(locale));
        }
        return counts;
      })();

  const translatedKeys = localeResults.reduce((sum, count) => sum + count, 0);
  config.i18n = i18n;

  return {
    sourceLocale,
    targetLocales,
    translatedKeys,
  };
}