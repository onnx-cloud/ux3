import type { Plugin } from '../../../src/plugin/registry';

export interface I18nPluginConfig {
  /** Locale to activate on install. Defaults to document.documentElement.lang or 'en'. */
  locale?: string;
  /** Extra translation namespaces loaded from remote JSON URLs (keyed by prefix). */
  namespaces?: Record<string, string>;
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

export const I18nPlugin: Plugin = {
  name: '@ux3/plugin-i18n',
  version: '1.0.0',
  description: 'Enhanced i18n plugin with pluralisation and remote namespace loading',
  install(app) {
    const cfg: I18nPluginConfig = (app.config as any)?.plugins?.['@ux3/plugin-i18n'] ??
      (app.config as any)?.plugins?.i18n ?? {};

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
            console.warn(`[plugin-i18n] failed to load namespace '${prefix}' from ${url}`, err);
          });
      }
    }
  }
};

export default I18nPlugin;
