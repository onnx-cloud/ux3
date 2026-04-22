import type { Plugin } from '../../../../src/plugin/registry';

export interface IconesPluginConfig {
  /** Default icon collection when icon name has no prefix. */
  defaultCollection?: string;
  /** Enabled collections (metadata only for now). */
  collections?: string[];
  /** Keep icons in local browser cache (defaults true). */
  cached?: boolean;
  /** Keep a memory bundle map active at runtime (defaults true). */
  bundled?: boolean;
  /** Auto-render <ux-icon> elements on install when in browser. */
  autoReplace?: boolean;
}

export interface IconRenderOptions {
  className?: string;
  width?: string | number;
  height?: string | number;
}

const DEFAULT_COLLECTION = 'lucide';
const CACHE_PREFIX = 'ux3:icones:';

function escapeAttr(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeIconName(icon: string, defaultCollection: string): string {
  if (!icon) return `${defaultCollection}:circle`;
  return icon.includes(':') ? icon : `${defaultCollection}:${icon}`;
}

function splitIconName(iconName: string): { collection: string; icon: string } {
  const normalized = iconName.trim();
  const idx = normalized.indexOf(':');
  if (idx <= 0) return { collection: DEFAULT_COLLECTION, icon: normalized || 'circle' };
  return {
    collection: normalized.slice(0, idx),
    icon: normalized.slice(idx + 1),
  };
}

function buildUxIconTag(iconName: string, opts: IconRenderOptions = {}): string {
  const classAttr = opts.className ? ` class="${escapeAttr(opts.className)}"` : '';
  const widthAttr = opts.width != null ? ` width="${escapeAttr(String(opts.width))}"` : '';
  const heightAttr = opts.height != null ? ` height="${escapeAttr(String(opts.height))}"` : '';
  return `<ux-icon name="${escapeAttr(iconName)}"${classAttr}${widthAttr}${heightAttr}></ux-icon>`;
}

function iconSvgUrl(iconName: string): string {
  const { collection, icon } = splitIconName(iconName);
  return `https://api.iconify.design/${encodeURIComponent(collection)}/${encodeURIComponent(icon)}.svg`;
}

function isSvgPayload(input: string): boolean {
  const s = input.trim().toLowerCase();
  return s.startsWith('<svg') && s.includes('</svg>');
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
}

async function fetchIconSvg(iconName: string, cached: boolean): Promise<string | null> {
  const key = `${CACHE_PREFIX}${iconName}`;
  const storage = getStorage();

  if (cached && storage) {
    const fromCache = storage.getItem(key);
    if (fromCache && isSvgPayload(fromCache)) {
      return fromCache;
    }
  }

  if (typeof fetch !== 'function') return null;

  try {
    const res = await fetch(iconSvgUrl(iconName));
    if (!res.ok) return null;
    const svg = await res.text();
    if (!isSvgPayload(svg)) return null;

    if (cached && storage) {
      storage.setItem(key, svg);
    }
    return svg;
  } catch {
    return null;
  }
}

function defineUxIconElement(defaultCollection: string, cached: boolean, bundled: boolean, bundleMap: Map<string, string>): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get('ux-icon')) return;

  class UxIcon extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['name', 'width', 'height'];
    }

    connectedCallback(): void {
      void this.renderIcon();
    }

    attributeChangedCallback(): void {
      void this.renderIcon();
    }

    private async renderIcon(): Promise<void> {
      const rawName = this.getAttribute('name') || '';
      const iconName = normalizeIconName(rawName, defaultCollection);

      let svg: string | null = null;
      if (bundled) {
        svg = bundleMap.get(iconName) ?? null;
      }
      if (!svg) {
        svg = await fetchIconSvg(iconName, cached);
      }
      if (!svg) {
        this.innerHTML = '';
        return;
      }

      const width = this.getAttribute('width');
      const height = this.getAttribute('height');
      let finalSvg = svg;

      if (width) {
        finalSvg = finalSvg.replace('<svg', `<svg width="${escapeAttr(width)}"`);
      }
      if (height) {
        finalSvg = finalSvg.replace('<svg', `<svg height="${escapeAttr(height)}"`);
      }

      this.innerHTML = finalSvg;
    }
  }

  customElements.define('ux-icon', UxIcon);
}

function upgradeUxIconPlaceholders(defaultCollection: string): void {
  if (typeof document === 'undefined') return;

  const nodes = document.querySelectorAll<HTMLElement>('[ux-icon]');
  nodes.forEach((node) => {
    const raw = node.getAttribute('ux-icon') || '';
    const iconName = normalizeIconName(raw, defaultCollection);
    const width = node.getAttribute('width') || '';
    const height = node.getAttribute('height') || '';
    const className = node.getAttribute('class') || '';

    const el = document.createElement('ux-icon');
    el.setAttribute('name', iconName);
    if (width) el.setAttribute('width', width);
    if (height) el.setAttribute('height', height);
    if (className) el.setAttribute('class', className);
    node.replaceWith(el);
  });
}

function readConfig(app: any, pluginRef: any): IconesPluginConfig {
  return pluginRef?.config ??
    (app.config as any)?.plugins?.['@ux3/plugin-icones'] ??
    (app.config as any)?.plugins?.icones ??
    {};
}

export const IconesPlugin: Plugin = {
  name: '@ux3/plugin-icones',
  version: '1.0.0',
  description: 'Icones/Iconify integration with Lucide as default collection',
  install(app) {
    const cfg = readConfig(app, IconesPlugin as any);
    const firstCollection = Array.isArray(cfg.collections) && cfg.collections.length > 0
      ? cfg.collections[0]
      : undefined;
    const defaultCollection = cfg.defaultCollection || firstCollection || DEFAULT_COLLECTION;
    const cached = cfg.cached !== false;
    const bundled = cfg.bundled !== false;
    const bundleMap = new Map<string, string>();

    defineUxIconElement(defaultCollection, cached, bundled, bundleMap);

    const api = {
      defaultCollection,
      collections: cfg.collections || [defaultCollection],
      cached,
      bundled,
      normalize(icon: string): string {
        return normalizeIconName(icon, defaultCollection);
      },
      icon(icon: string, options?: IconRenderOptions): string {
        return buildUxIconTag(normalizeIconName(icon, defaultCollection), options);
      },
      async svg(icon: string): Promise<string | null> {
        const iconName = normalizeIconName(icon, defaultCollection);
        const fromBundle = bundled ? (bundleMap.get(iconName) ?? null) : null;
        if (fromBundle) return fromBundle;
        return fetchIconSvg(iconName, cached);
      },
      async preload(icons: string[]): Promise<void> {
        for (const icon of icons) {
          const iconName = normalizeIconName(icon, defaultCollection);
          const svg = await fetchIconSvg(iconName, cached);
          if (bundled && svg) {
            bundleMap.set(iconName, svg);
          }
        }
      },
      replace(): void {
        upgradeUxIconPlaceholders(defaultCollection);
      }
    };

    app.utils = app.utils || {};
    (app.utils as any).icones = api;

    app.registerService?.('icones', () => api);

    if (cfg.autoReplace !== false) {
      api.replace();
    }
  }
};

export default IconesPlugin;
