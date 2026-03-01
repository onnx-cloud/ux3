import { describe, it, expect } from 'vitest';
import { HookRegistry, AppLifecyclePhase, ComponentLifecyclePhase, ServiceLifecyclePhase } from '../lifecycle';

describe('HookRegistry', () => {
  it('executes registered hooks in order', async () => {
    const registry = new HookRegistry();
    const results: string[] = [];

    registry.on('a', () => results.push('first'));
    registry.on('a', () => results.push('second'));

    await registry.execute('a', { phase: 'a' });
    expect(results).toEqual(['first', 'second']);
  });

  it('supports async hooks', async () => {
    const registry = new HookRegistry();
    const results: string[] = [];

    registry.on('x', async () => {
      await new Promise((r) => setTimeout(r, 10));
      results.push('after');
    });
    registry.on('x', () => results.push('sync'));

    await registry.execute('x', { phase: 'x' });
    expect(results).toEqual(['after', 'sync']);
  });

  it('allows removing hooks', () => {
    const registry = new HookRegistry();
    const fn = () => {};
    registry.on('p', fn);
    registry.off('p', fn);
    expect(() => registry.execute('p', { phase: 'p' })).not.toThrow();
  });

  it('clears by phase and entirely', () => {
    const registry = new HookRegistry();
    const called: string[] = [];
    registry.on('foo', () => called.push('foo'));
    registry.on('bar', () => called.push('bar'));

    registry.clear('foo');
    registry.execute('foo', { phase: 'foo' });
    expect(called).toEqual([]);

    registry.clear();
    registry.execute('bar', { phase: 'bar' });
    expect(called).toEqual([]);
  });
});

// enumerations should contain expected values
describe('Lifecycle phase enums', () => {
  it('has correct app phases', () => {
    expect(AppLifecyclePhase.INIT).toBe('ux3.app.phase.init');
    expect(Object.values(AppLifecyclePhase)).toContain('ux3.app.phase.hydrate');
  });
  it('has component and service values', () => {
    expect(Object.values(ComponentLifecyclePhase)).toContain('ux3.component.phase.mount');
    expect(Object.values(ServiceLifecyclePhase)).toContain('ux3.service.phase.connect');
  });
});
