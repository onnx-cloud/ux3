import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.1.0';

export interface GoogleFontsConfig {
  /** Font families to load, e.g. ['Open Sans', 'Roboto'] */
  family?: string | string[];
  /** Default font family to apply */
  default?: string;
  /** Google Fonts display strategy (default: 'swap') */
  display?: string;
}

function buildFontsUrl(families: string[], display: string): string {
  const params = families
    .filter((f) => typeof f === 'string' && f.trim().length > 0)
    .map((f) => `family=${encodeURIComponent(f.trim()).replace(/%20/g, '+')}`)
    .join('&');
  if (!params) return '';
  return `https://fonts.googleapis.com/css2?${params}&display=${encodeURIComponent(display)}`;
}

function readConfig(app: any): GoogleFontsConfig {
  return (
    (GoogleFontsPlugin as any).config ??
    app.config?.plugins?.['@ux3/plugin-google-fonts'] ??
    {}
  );
}

function normaliseFamilies(family: string | string[] | undefined): string[] {
  if (!family) return [];
  return Array.isArray(family) ? family : [family];
}

export const GoogleFontsPlugin: Plugin = {
  name: '@ux3/plugin-google-fonts',
  version,
  description: 'Google Fonts integration for UX3 – injects the Fonts CSS stylesheet',

  install(app) {
    const cfg = readConfig(app);
    const families = normaliseFamilies(cfg.family);
    const display = cfg.display ?? 'swap';
    const defaultFont = cfg.default ?? families[0];

    // Inject the Google Fonts <link> at runtime when running in a browser.
    // The build-time config-generator also emits this URL into config.site.assets
    // so it is included in the generated HTML <head> without a JS round-trip.
    if (typeof document !== 'undefined' && families.length > 0) {
      const fontsUrl = buildFontsUrl(families, display);
      if (fontsUrl && !document.querySelector('link[href^="https://fonts.googleapis.com"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontsUrl;
        document.head.appendChild(link);
      }
    }

    const api = {
      families,
      default: defaultFont,
      display,
      /** Returns a CSS font-family declaration for the given family. */
      cssFamily: (family: string) => `'${family}', sans-serif`,
    };

    app.utils = app.utils ?? {};
    (app.utils as any).fonts = api;

    app.registerService?.('fonts', () => ({
      families,
      default: defaultFont,
      cssFamily: (family: string) => `'${family}', sans-serif`,
    }));
  },
};

export default GoogleFontsPlugin;
