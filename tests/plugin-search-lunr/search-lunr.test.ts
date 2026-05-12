import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchLunrPlugin } from '../../packages/@ux3/ux-search-lunr/src/index';

describe('SearchLunrPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    delete (SearchLunrPlugin as any).config;
    mockApp = {
      config: {},
      registerService: vi.fn(),
      registerAsset: vi.fn(),
      utils: {},
    };
  });

  it('has expected metadata', () => {
    expect(SearchLunrPlugin.name).toBe('@ux3/ux-search-lunr');
    expect(SearchLunrPlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('registers the search service', () => {
    SearchLunrPlugin.install?.(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('search', expect.any(Function));
  });

  it('registers Lunr CDN script asset', () => {
    SearchLunrPlugin.install?.(mockApp);
    const call = mockApp.registerAsset.mock.calls[0]?.[0];
    expect(call?.type).toBe('script');
    expect(call?.src).toContain('lunr');
  });

  it('defaults to cached:true', () => {
    SearchLunrPlugin.install?.(mockApp);
    expect((mockApp.utils as any).search.cached).toBe(true);
  });

  it('respects cached:false config', () => {
    (SearchLunrPlugin as any).config = { cached: false };
    SearchLunrPlugin.install?.(mockApp);
    expect((mockApp.utils as any).search.cached).toBe(false);
  });

  it('search returns empty array before build()', () => {
    SearchLunrPlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();
    expect(service.search('hello')).toEqual([]);
  });

  it('build() throws when Lunr is not loaded', () => {
    SearchLunrPlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();
    expect(() => service.build([{ id: '1', title: 'test' }], ['title'])).toThrow(
      '@ux3/ux-search-lunr'
    );
  });

  it('build() and search() work when lunr global is available', () => {
    // Minimal lunr stub – lunr() is called as a plain function (not with new),
    // so we build a local context object rather than relying on `this`.
    const indexEntries: any[] = [];
    const stubIndex = {
      search: (q: string) =>
        indexEntries
          .filter((e) => e.title?.includes(q))
          .map((e) => ({ ref: e.id, score: 1, matchData: {} })),
      toJSON: () => ({}),
    };
    (globalThis as any).window = {
      lunr: Object.assign(
        function (fn: (this: any) => void) {
          const ctx = {
            ref: vi.fn(),
            field: vi.fn(),
            add: (doc: any) => indexEntries.push(doc),
          };
          fn.call(ctx);
          return stubIndex;
        },
        { Index: { load: () => stubIndex } }
      ),
    };

    (SearchLunrPlugin as any).config = { cached: false };
    SearchLunrPlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();

    service.build([{ id: '1', title: 'hello world' }], ['title']);
    const results = service.search('hello');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].ref).toBe('1');

    delete (globalThis as any).window;
  });

  it('clearCache() resets the index state', () => {
    SearchLunrPlugin.install?.(mockApp);
    const [, factory] = mockApp.registerService.mock.calls[0];
    const service = factory();
    service.clearCache();
    expect(service.search('anything')).toEqual([]);
  });
});
