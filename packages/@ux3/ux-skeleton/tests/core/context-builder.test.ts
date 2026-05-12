import { describe, it, expect } from 'vitest';
import { buildContext } from '../../src/core/context-builder';
import { defaultCasingStrategy } from '../../src/core/strategies';

describe('context-builder', () => {
  it('builds context with casing variants', async () => {
    const ctx = await buildContext('my-view');
    expect(ctx.name).toBe('my-view');
    expect(ctx.Name).toBe('MyView');
    expect(ctx.name_snake).toBe('my_view');
    expect(ctx.NAME).toBe('MY_VIEW');
  });

  it('includes metadata (year, date, ux3Version)', async () => {
    const ctx = await buildContext('test');
    expect(ctx.year).toBeDefined();
    expect(ctx.date).toBeDefined();
    expect(ctx.ux3Version).toBeDefined();
    expect(ctx.date).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('merges extra tokens', async () => {
    const ctx = await buildContext('test', defaultCasingStrategy, undefined, {
      author: 'Jane Doe',
      license: 'MIT',
    });
    expect(ctx.author).toBe('Jane Doe');
    expect(ctx.license).toBe('MIT');
  });

  it('normalizes various input formats to kebab', async () => {
    const inputs = ['MyView', 'my_view', 'my view', 'my-view'];
    for (const input of inputs) {
      const ctx = await buildContext(input);
      expect(ctx.name).toBe('my-view');
      expect(ctx.Name).toBe('MyView');
    }
  });
});
