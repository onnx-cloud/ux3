import type { GeneratedConfig } from '@ux3/ui/context-builder.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  prompts?: {
    batch?: { system?: string };
  };
}

export interface BuildTimeTranslateResult {
  sourceLocale: string;
  targetLocales: string[];
  translatedKeys: number;
}

type BatchTranslateFn = (
  texts: Record<string, string>,
  targetLocale: string,
  sourceLocale: string,
  options: { endpoint: string; model: string; apiKey: string; systemPrompt?: string }
) => Promise<Record<string, string>>;

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

interface PromptConfig {
  batch: { system: string };
  runtime: { system: string };
}

let _defaultPrompts: PromptConfig | null = null;

function loadDefaultPrompts(): PromptConfig {
  if (_defaultPrompts) return _defaultPrompts;
  try {
    const promptsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'prompts.json');
    if (fs.existsSync(promptsPath)) {
      _defaultPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8')) as PromptConfig;
      return _defaultPrompts;
    }
  } catch {
    // fall through to hardcoded defaults
  }
  _defaultPrompts = {
    batch: {
      system:
        'You are a professional translator. ' +
        'Translate the JSON values below from {{sourceLocale}} to {{targetLocale}}. ' +
        'Return a JSON object with the same keys and the translated values. ' +
        'Return only valid JSON with no additional commentary, markdown fences, or explanations.',
    },
    runtime: {
      system:
        'You are a professional translator. ' +
        'Translate the following text from {{sourceLocale}} to {{targetLocale}}. ' +
        'Return only the translated text with no additional commentary.',
    },
  };
  return _defaultPrompts;
}

function resolvePrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function callBatchTranslationApi(
  texts: Record<string, string>,
  targetLocale: string,
  sourceLocale: string,
  options: { endpoint: string; model: string; apiKey: string; systemPrompt?: string }
): Promise<Record<string, string>> {
  const keys = Object.keys(texts);
  if (keys.length === 0) return {};

  const sourceJson = JSON.stringify(texts, null, 2);

  const defaultPrompts = loadDefaultPrompts();
  const systemPrompt = options.systemPrompt || defaultPrompts.batch.system;

  const body = JSON.stringify({
    model: options.model,
    messages: [
      { role: 'system', content: resolvePrompt(systemPrompt, { sourceLocale, targetLocale }) },
      { role: 'user', content: sourceJson },
    ],
    max_tokens: 4096,
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
    let details = '';
    try {
      const raw = (await response.text()).trim();
      if (raw) details = ': ' + raw.replace(/\s+/g, ' ').slice(0, 240);
    } catch { /* ignore */ }

    throw new Error(
      `@ux3/plugin-i18n: API request failed - HTTP ${response.status}${details}`
    );
  }

  const data = (await response.json()) as any;
  const rawContent: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!rawContent) {
    throw new Error('@ux3/plugin-i18n: API returned empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const cleaned = rawContent.replace(/```json\s*|\s*```/g, '').trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('@ux3/plugin-i18n: API returned invalid JSON: ' + rawContent.slice(0, 200));
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('@ux3/plugin-i18n: API returned non-object response');
  }

  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = (parsed as Record<string, unknown>)[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      result[key] = val.trim();
    }
  }

  return result;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectFlat(source: Record<string, unknown>, target: Record<string, unknown>, overwrite: boolean, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  const pfx = prefix ? prefix + '.' : '';
  for (const [key, value] of Object.entries(source)) {
    const fullKey = pfx + key;
    const existing = target[key];
    if (typeof value === 'string') {
      if (!overwrite && typeof existing === 'string' && existing.trim().length > 0) continue;
      out[fullKey] = value;
    } else if (isRecord(value)) {
      const nestedTarget = isRecord(existing) ? existing : {};
      Object.assign(out, collectFlat(value, nestedTarget, overwrite, fullKey));
    }
  }
  return out;
}

function applyFlat(target: Record<string, unknown>, translations: Record<string, string>): void {
  for (const [fullKey, value] of Object.entries(translations)) {
    const dot = fullKey.indexOf('.');
    if (dot < 0) {
      target[fullKey] = value;
    } else {
      const top = fullKey.slice(0, dot);
      const rest = fullKey.slice(dot + 1);
      if (!target[top] || !isRecord(target[top])) target[top] = {};
      (target[top] as Record<string, unknown>)[rest] = value;
    }
  }
}

export async function applyBuildTimeTranslation(
  config: GeneratedConfig,
  pluginConfig: BuildTimeTranslateConfig,
  deps: { translateFn?: BatchTranslateFn } = {}
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
      `@ux3/plugin-i18n: source locale '${sourceLocale}' not found in config.i18n`
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
    throw new Error('@ux3/plugin-i18n: apiKey is required (set config.apiKey or env GROQ_API_KEY)');
  }

  const targetLocales = (Array.isArray(pluginConfig.locales)
    ? pluginConfig.locales.filter((l) => l && l !== sourceLocale)
    : Object.keys(i18n).filter((l) => l !== sourceLocale));

  if (targetLocales.length === 0) {
    return { sourceLocale, targetLocales: [], translatedKeys: 0 };
  }

  const overwrite = pluginConfig.overwrite === true;
  const translateFn = deps.translateFn || callBatchTranslationApi;
  const systemPrompt = pluginConfig.prompts?.batch?.system;
  const client = { endpoint, model, apiKey, systemPrompt };

  let translatedKeys = 0;

  for (const targetLocale of targetLocales) {
    const target = (i18n[targetLocale] ?? {}) as Record<string, unknown>;

    const toTranslate = collectFlat(source as Record<string, unknown>, target, overwrite);

    if (Object.keys(toTranslate).length === 0) continue;

    console.log(`   ${sourceLocale} → ${targetLocale}: ${Object.keys(toTranslate).length} keys`);

    const translated = await translateFn(toTranslate, targetLocale, sourceLocale, client);
    applyFlat(target, translated);
    i18n[targetLocale] = target as Record<string, string>;

    translatedKeys += Object.keys(translated).length;
  }

  config.i18n = i18n;

  return { sourceLocale, targetLocales, translatedKeys };
}
