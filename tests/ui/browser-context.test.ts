import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureBrowserContext, observeBrowserContext } from '../../src/ui/browser-context.ts';

describe('browser context', () => {
  const originalLanguage = navigator.language;
  const originalLanguages = (navigator as any).languages;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        media: query,
        matches: query.includes('prefers-color-scheme: dark') || query.includes('pointer: fine'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: originalLanguage });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: originalLanguages });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('captures normalized browser context', () => {
    const context = captureBrowserContext();

    expect(context.locale.primary).toBeTruthy();
    expect(context.locale.language).toBeTruthy();
    expect(context.datetime.offsetMinutes).toBeTypeOf('number');
    expect(context.display.viewport.width).toBeTypeOf('number');
    expect(context.display.viewport.height).toBeTypeOf('number');
    expect(context.connectivity.online).toBeTypeOf('boolean');
    expect(context.sources.locale).toContain('navigator.language');
  });

  it('normalizes locale and detects rtl direction', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'ar-eg' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['ar-eg', 'en-us'] });

    const context = captureBrowserContext();

    expect(context.locale.primary).toBe('ar-EG');
    expect(context.locale.language).toBe('ar');
    expect(context.locale.region).toBe('EG');
    expect(context.locale.direction).toBe('rtl');
  });

  it('observes changes and emits updates', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    const changes: Array<number> = [];
    const stop = observeBrowserContext((context) => {
      changes.push(context.display.viewport.width);
    }, { debounceMs: 1 });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    window.dispatchEvent(new Event('resize'));

    await new Promise((resolve) => setTimeout(resolve, 10));

    stop();

    expect(changes.length).toBeGreaterThan(0);
    expect(changes[changes.length - 1]).toBe(640);
  });
});
