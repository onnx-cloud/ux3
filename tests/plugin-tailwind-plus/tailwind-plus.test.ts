import { describe, it, expect, beforeEach } from 'vitest';
import {
  isOfficialTailwindPlusSource,
  normalizeTailwindPlusWidgets,
  registerOfficialTailwindPlusWidgets,
  mergeClasses,
  TailwindPlusPlugin
} from '../../packages/@ux3/plugin-tailwind-plus/src/index';

describe('TailwindPlusPlugin', () => {
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
  });

  // ========== Plugin Metadata ==========
  describe('Plugin Metadata', () => {
    it('should export the correct plugin name and version', () => {
      expect(TailwindPlusPlugin.name).toBe('@ux3/plugin-tailwind-plus');
      expect(TailwindPlusPlugin.version).toBe('0.1.0');
      expect(TailwindPlusPlugin.description).toContain('Official Tailwind Plus');
    });
  });

  describe('Utility Helpers', () => {
    it('should merge multiple class strings correctly', () => {
      const result = mergeClasses('px-4 py-2', 'bg-blue-500', 'hover:bg-blue-600');
      expect(result).toBe('px-4 py-2 bg-blue-500 hover:bg-blue-600');
    });

    it('should filter out falsy values in mergeClasses', () => {
      const result = mergeClasses('px-4', undefined, null, false, 'py-2');
      expect(result).toBe('px-4 py-2');
    });

    it('should validate official Tailwind Plus URLs only', () => {
      expect(isOfficialTailwindPlusSource('https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes')).toBe(true);
      expect(isOfficialTailwindPlusSource('https://www.tailwindcss.com/plus/application-ui/forms/sign-in-forms')).toBe(true);
      expect(isOfficialTailwindPlusSource('https://tailwindcss.com/docs')).toBe(false);
      expect(isOfficialTailwindPlusSource('https://example.com/plus/ui-blocks')).toBe(false);
      expect(isOfficialTailwindPlusSource('not-a-url')).toBe(false);
    });
  });

  describe('Widget Normalization', () => {
    it('should keep only valid official widget definitions', () => {
      const widgets = normalizeTailwindPlusWidgets([
        {
          id: 'hero.centered',
          source: 'https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes',
          template: '<section>Official Hero</section>',
          route: '/hero'
        },
        {
          id: 'fake.widget',
          source: 'https://example.com/plus/ui-blocks/marketing/sections/heroes',
          template: '<section>Should be filtered</section>'
        },
        {
          id: 'missing.template',
          source: 'https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes'
        }
      ]);

      expect(widgets).toHaveLength(1);
      expect(widgets[0]?.id).toBe('hero.centered');
    });
  });

  describe('Widget Registration', () => {
    it('should register views and optional routes for official widgets only', () => {
      const registeredViews: Array<{ name: string; template: string }> = [];
      const registeredRoutes: Array<{ path: string; view: string }> = [];

      const app = {
        registerView: (name: string, template: string) => registeredViews.push({ name, template }),
        registerRoute: (path: string, view: string) => registeredRoutes.push({ path, view })
      } as any;

      const result = registerOfficialTailwindPlusWidgets(app, [
        {
          id: 'hero.centered',
          source: 'https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes',
          template: '<section>Official Hero</section>',
          route: '/hero'
        }
      ]);

      expect(result.registered).toBe(1);
      expect(registeredViews).toHaveLength(1);
      expect(registeredViews[0]?.name).toBe('tailwind-plus-hero-centered');
      expect(registeredRoutes).toHaveLength(1);
      expect(registeredRoutes[0]?.path).toBe('/hero');
      expect(registeredRoutes[0]?.view).toBe('tailwind-plus-hero-centered');
    });
  });

  describe('Plugin Install', () => {
    it('should not register arbitrary demo views or routes by default', async () => {
      const registeredViews: Array<{ name: string; template: string }> = [];
      const registeredRoutes: Array<{ path: string; view: string }> = [];
      const registeredAssets: Array<{ type: string; src?: string; href?: string }> = [];

      const app = {
        config: {
          plugins: [
            {
              name: '@ux3/plugin-tailwind-plus',
              config: {
                css: 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'
              }
            }
          ]
        },
        registerView: (name: string, template: string) => registeredViews.push({ name, template }),
        registerRoute: (path: string, view: string) => registeredRoutes.push({ path, view }),
        registerAsset: (asset: { type: string; src?: string; href?: string }) => registeredAssets.push(asset),
        utils: {}
      } as any;

      await TailwindPlusPlugin.install?.(app);

      expect(registeredViews).toHaveLength(0);
      expect(registeredRoutes).toHaveLength(0);
      expect(registeredAssets).toHaveLength(1);
      expect(registeredAssets[0]?.type).toBe('script');
      expect(registeredAssets[0]?.src).toContain('@tailwindcss/browser');
      expect(app.utils.tailwindPlus).toBeDefined();
    });

    it('should register only official configured widgets and warn for rejected ones', async () => {
      const registeredViews: Array<{ name: string; template: string }> = [];
      const registeredRoutes: Array<{ path: string; view: string }> = [];
      const warnings: string[] = [];

      const app = {
        config: {
          plugins: [
            {
              name: '@ux3/plugin-tailwind-plus',
              config: {
                widgets: [
                  {
                    id: 'hero.centered',
                    source: 'https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes',
                    template: '<section>Official Hero</section>',
                    route: '/hero'
                  },
                  {
                    id: 'fake',
                    source: 'https://example.com/plus/ui-blocks',
                    template: '<section>Fake</section>'
                  }
                ]
              }
            }
          ]
        },
        registerView: (name: string, template: string) => registeredViews.push({ name, template }),
        registerRoute: (path: string, view: string) => registeredRoutes.push({ path, view }),
        logger: { warn: (msg: string) => warnings.push(msg) },
        utils: {}
      } as any;

      await TailwindPlusPlugin.install?.(app);

      expect(registeredViews).toHaveLength(1);
      expect(registeredRoutes).toHaveLength(1);
      expect(warnings.length).toBe(1);
    });
  });
});
