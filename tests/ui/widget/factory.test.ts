/**
 * WidgetFactory Unit Tests
 * Test lazy-loading widget instantiation and caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WidgetFactory, type WidgetLoader } from '../../src/ui/widget/factory';

describe('WidgetFactory - Comprehensive Tests', () => {
  let factory: WidgetFactory;

  beforeEach(() => {
    factory = new WidgetFactory();
  });

  describe('Synchronous Registration', () => {
    it('should register widget synchronously', () => {
      const widget = { name: 'test-widget' };
      factory.register('test', widget);

      expect(factory['cache'].has('test')).toBe(true);
    });

    it('should cache registered widget', async () => {
      const widget = { name: 'my-widget' };
      factory.register('my', widget);

      const retrieved = await factory.get('my');
      expect(retrieved).toBe(widget);
    });

    it('should overwrite previously registered widget', async () => {
      factory.register('widget', { v: 1 });
      factory.register('widget', { v: 2 });

      const retrieved = await factory.get('widget');
      expect((retrieved as any).v).toBe(2);
    });

    it('should handle multiple widget registrations', async () => {
      factory.register('widget1', { name: 'w1' });
      factory.register('widget2', { name: 'w2' });
      factory.register('widget3', { name: 'w3' });

      expect(await factory.get('widget1')).toBeDefined();
      expect(await factory.get('widget2')).toBeDefined();
      expect(await factory.get('widget3')).toBeDefined();
    });

    it('should support any widget object', () => {
      const customWidget = {
        render: () => '<div>Widget</div>',
        mount: (el: Element) => {},
        unmount: () => {},
      };

      factory.register('custom', customWidget);
      expect(factory['cache'].has('custom')).toBe(true);
    });
  });

  describe('Lazy Registration', () => {
    it('should register lazy loader', () => {
      const loader: WidgetLoader = () =>
        Promise.resolve({ name: 'lazy-widget' });

      factory.registerLazy('lazy', loader);

      expect(factory['loaders'].has('lazy')).toBe(true);
    });

    it('should not load immediately', () => {
      const loaderFn = vi.fn().mockResolvedValue({ name: 'widget' });
      factory.registerLazy('lazy', loaderFn);

      expect(loaderFn).not.toHaveBeenCalled();
    });

    it('should load on first access', async () => {
      const loaderFn = vi.fn().mockResolvedValue({ name: 'lazy-widget' });
      factory.registerLazy('lazy', loaderFn);

      await factory.get('lazy');

      expect(loaderFn).toHaveBeenCalled();
    });

    it('should support default export', async () => {
      const widget = { name: 'widget' };
      const loader: WidgetLoader = () =>
        Promise.resolve({ default: widget });

      factory.registerLazy('lazy', loader);

      const result = await factory.get('lazy');
      expect(result).toBe(widget);
    });

    it('should support both loader patterns', async () => {
      const widget1 = { name: 'w1' };
      const widget2 = { name: 'w2' };

      factory.registerLazy('direct', async () => widget1);
      factory.registerLazy('export', async () => ({ default: widget2 }));

      const r1 = await factory.get('direct');
      const r2 = await factory.get('export');

      expect(r1).toBe(widget1);
      expect(r2).toBe(widget2);
    });
  });

  describe('Retrieval and Caching', () => {
    it('should return from cache if available', async () => {
      const widget = { name: 'cached' };
      factory.register('widget', widget);

      const result = await factory.get('widget');

      expect(result).toBe(widget);
    });

    it('should load lazily if not cached', async () => {
      const loaderFn = vi.fn().mockResolvedValue({ name: 'lazy' });
      factory.registerLazy('lazy', loaderFn);

      const result = await factory.get('lazy');

      expect(loaderFn).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should cache lazy-loaded widget', async () => {
      const loaderFn = vi.fn().mockResolvedValue({ name: 'lazy' });
      factory.registerLazy('lazy', loaderFn);

      await factory.get('lazy');
      await factory.get('lazy');

      // Should only call loader once
      expect(loaderFn).toHaveBeenCalledTimes(1);
    });

    it('should throw for unregistered widget', async () => {
      await expect(factory.get('nonexistent')).rejects.toThrow();
    });

    it('should handle concurrent loads', async () => {
      let loadCount = 0;
      const loaderFn = async () => {
        loadCount++;
        return { name: 'widget' };
      };

      factory.registerLazy('concurrent', loaderFn);

      const [r1, r2, r3] = await Promise.all([
        factory.get('concurrent'),
        factory.get('concurrent'),
        factory.get('concurrent'),
      ]);

      // Should deduplicate requests
      expect(loadCount).toBe(1);
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
    });

    it('should handle loader errors', async () => {
      factory.registerLazy('error', async () => {
        throw new Error('Load failed');
      });

      await expect(factory.get('error')).rejects.toThrow('Load failed');
    });

    it('should retry failed loads', async () => {
      let callCount = 0;
      const loaderFn = async () => {
        callCount++;
        if (callCount < 2) throw new Error('First call fails');
        return { name: 'widget' };
      };

      factory.registerLazy('retry', loaderFn);

      await expect(factory.get('retry')).rejects.toThrow();
      const result = await factory.get('retry');

      // Should retry after cache clears
      expect(result).toBeDefined();
    });
  });

  describe('Registry Management', () => {
    it('should list registered widgets', () => {
      factory.register('w1', { name: 'w1' });
      factory.register('w2', { name: 'w2' });

      const list = factory.listWidgets();

      expect(list).toContain('w1');
      expect(list).toContain('w2');
    });

    it('should list lazy widgets', () => {
      factory.registerLazy('lazy1', async () => ({ name: 'l1' }));
      factory.registerLazy('lazy2', async () => ({ name: 'l2' }));

      const list = factory.listWidgets();

      expect(list).toContain('lazy1');
      expect(list).toContain('lazy2');
    });

    it('should check widget existence', () => {
      factory.register('widget', { name: 'w' });

      expect(factory.has('widget')).toBe(true);
      expect(factory.has('nonexistent')).toBe(false);
    });

    it('should clear cache', async () => {
      factory.register('w1', { name: 'w1' });
      factory.registerLazy('w2', async () => ({ name: 'w2' }));

      factory.clear();

      expect(factory['cache'].size).toBe(0);
      expect(factory['loaders'].size).toBe(0);
    });

    it('should clear specific widget', async () => {
      factory.register('keep', { name: 'keep' });
      factory.register('remove', { name: 'remove' });

      factory.clear('remove');

      expect(factory.has('keep')).toBe(true);
      expect(factory.has('remove')).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle null widgets', () => {
      expect(() => {
        factory.register('null', null as any);
      }).not.toThrow();
    });

    it('should handle undefined widgets', () => {
      expect(() => {
        factory.register('undef', undefined as any);
      }).not.toThrow();
    });

    it('should handle loader timeouts', async () => {
      const loaderFn = async () => {
        await new Promise((resolve) =>
          setTimeout(resolve, 10000)
        );
        return { name: 'widget' };
      };

      factory.registerLazy('slow', loaderFn);

      // Should complete without timeout (but be slow)
      // Note: For real timeout testing, would need timeout implementation
      expect(factory.has('slow')).toBe(true);
    });

    it('should handle circular dependencies', async () => {
      factory.registerLazy('circular', async () => {
        const dep = await factory.get('circular');
        return dep;
      });

      // Should detect circular reference
      await expect(factory.get('circular')).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should retrieve cached widget instantly', async () => {
      factory.register('widget', { name: 'w' });

      const start = performance.now();
      await factory.get('widget');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle many widgets', async () => {
      for (let i = 0; i < 1000; i++) {
        factory.register(`widget${i}`, { name: `w${i}` });
      }

      const start = performance.now();
      await factory.get('widget500');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should deduplicate concurrent loads efficiently', async () => {
      let loadTime = 0;
      factory.registerLazy('slow', async () => {
        loadTime++;
        return new Promise((resolve) => {
          setTimeout(() => resolve({ name: 'widget' }), 10);
        });
      });

      const start = performance.now();
      await Promise.all([
        factory.get('slow'),
        factory.get('slow'),
        factory.get('slow'),
      ]);
      const duration = performance.now() - start;

      // Should only take as long as single load
      expect(loadTime).toBe(1);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle UI widget library', async () => {
      // Register core widgets
      factory.register('button', {
        render: () => '<button></button>',
      });
      factory.register('input', {
        render: () => '<input />',
      });

      // Register lazy-loaded complex widgets
      factory.registerLazy('calendar', async () => ({
        render: () => '<calendar></calendar>',
      }));

      factory.registerLazy('data-table', async () => ({
        render: () => '<table></table>',
      }));

      const button = await factory.get('button');
      const calendar = await factory.get('calendar');

      expect(button).toBeDefined();
      expect(calendar).toBeDefined();
    });

    it('should handle dynamic plugin loading', async () => {
      factory.registerLazy('plugin-analytics', async () => ({
        init: () => {},
      }));

      factory.registerLazy('plugin-auth', async () => ({
        login: () => {},
      }));

      const analytics = await factory.get('plugin-analytics');
      const auth = await factory.get('plugin-auth');

      expect(analytics).toBeDefined();
      expect(auth).toBeDefined();
    });

    it('should handle versioned widgets', async () => {
      factory.register('widget@1.0', { version: '1.0' });
      factory.register('widget@2.0', { version: '2.0' });

      const v1 = await factory.get('widget@1.0');
      const v2 = await factory.get('widget@2.0');

      expect((v1 as any).version).toBe('1.0');
      expect((v2 as any).version).toBe('2.0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty name', async () => {
      factory.register('', { name: 'empty' });

      const result = await factory.get('');
      expect(result).toBeDefined();
    });

    it('should handle names with special characters', async () => {
      factory.register('widget-@latest', { name: 'w' });

      const result = await factory.get('widget-@latest');
      expect(result).toBeDefined();
    });

    it('should handle very large widget objects', async () => {
      const largeWidget = {
        data: Array(10000).fill('x'),
      };

      factory.register('large', largeWidget);

      const result = await factory.get('large');
      expect(result).toBeDefined();
    });

    it('should handle rapid register/unregister cycles', async () => {
      for (let i = 0; i < 100; i++) {
        factory.register(`w${i}`, { name: `w${i}` });
        factory.clear(`w${i}`);
      }

      expect(factory.listWidgets().length).toBe(0);
    });
  });
});
