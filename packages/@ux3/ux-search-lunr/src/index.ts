import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.1.0';

const DEFAULT_CDN = 'https://unpkg.com/lunr/lunr.js';
const DEFAULT_CACHE_KEY = 'ux3:search:index';

export interface SearchLunrConfig {
  /** Load and cache Lunr.js from CDN (default: true) */
  bundled?: boolean;
  /** Persist the built search index in localStorage (default: true) */
  cached?: boolean;
  /** Override the Lunr.js CDN URL */
  cdn?: string;
  /** localStorage key used to store the serialised index */
  cacheKey?: string;
}

export interface SearchDocument {
  id: string;
  [field: string]: unknown;
}

export interface SearchResult {
  ref: string;
  score: number;
  matchData: unknown;
  /** The original document, when the store is populated at build time. */
  doc?: SearchDocument;
}

function readConfig(app: any): SearchLunrConfig {
  return (
    (SearchLunrPlugin as any).config ??
    app.config?.plugins?.['@ux3/ux-search-lunr'] ??
    {}
  );
}

function getLunr(): any {
  if (typeof window !== 'undefined' && (window as any).lunr) {
    return (window as any).lunr;
  }
  return null;
}

function safeStorageGet(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch { /* quota exceeded or private mode – silently skip */ }
}

function safeStorageRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export const SearchLunrPlugin: Plugin = {
  name: '@ux3/ux-search-lunr',
  version,
  description: 'Full-text search powered by Lunr.js for UX3',

  install(app) {
    const cfg = readConfig(app);
    const cdnUrl = cfg.cdn ?? DEFAULT_CDN;
    const cached = cfg.cached ?? true;
    const cacheKey = cfg.cacheKey ?? DEFAULT_CACHE_KEY;

    app.registerAsset?.({ type: 'script', src: cdnUrl });

    app.registerService?.('search', () => {
      let index: any = null;
      // In-memory document store so results can include the original document.
      let store: Record<string, SearchDocument> = {};

      return {
        /**
         * Build a Lunr index from an array of documents.
         *
         * If `cached:true` is configured the serialised index is persisted to
         * localStorage so subsequent page loads skip the build step.
         *
         * @param documents  Array of plain objects, each with at least an `id` field.
         * @param fields     Document fields to include in the full-text index.
         */
        build(documents: SearchDocument[], fields: string[]) {
          const lunr = getLunr();
          if (!lunr) {
            throw new Error(
              '@ux3/ux-search-lunr: Lunr.js is not loaded. ' +
              'Make sure bundled:true is set or load the library manually.'
            );
          }

          // Rebuild the in-memory store regardless of whether we can reuse a
          // cached serialised index (the store is not serialised to localStorage).
          store = {};
          for (const doc of documents) store[doc.id] = doc;

          if (cached) {
            const raw = safeStorageGet(cacheKey);
            if (raw) {
              try {
                index = lunr.Index.load(JSON.parse(raw));
                return;
              } catch {
                // corrupt cache – fall through to rebuild
                safeStorageRemove(cacheKey);
              }
            }
          }

          index = lunr(function (this: any) {
            this.ref('id');
            for (const field of fields) this.field(field);
            for (const doc of documents) this.add(doc);
          });

          if (cached) {
            safeStorageSet(cacheKey, JSON.stringify(index.toJSON()));
          }
        },

        /**
         * Search the index for the given query string.
         * Returns an empty array if the index has not been built yet.
         */
        search(query: string): SearchResult[] {
          if (!index) return [];
          const lunr = getLunr();
          if (!lunr) return [];
          try {
            return (index.search(query) as any[]).map((r) => ({
              ...r,
              doc: store[r.ref],
            }));
          } catch {
            // Lunr throws on malformed query strings – return empty rather than crashing.
            return [];
          }
        },

        /** Remove the cached index from localStorage and clear the in-memory state. */
        clearCache() {
          index = null;
          store = {};
          safeStorageRemove(cacheKey);
        },
      };
    });

    app.utils = app.utils ?? {};
    (app.utils as any).search = { cdn: cdnUrl, cached };
  },
};

export default SearchLunrPlugin;
