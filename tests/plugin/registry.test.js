import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '@ux3/plugin/registry';
describe('PluginRegistry', () => {
    it('registers and retrieves plugins', () => {
        const reg = new PluginRegistry();
        const plugin = { name: 'foo', version: '1.0.0' };
        reg.register(plugin);
        expect(reg.has('foo')).toBe(true);
        expect(reg.load('foo')).toBe(plugin);
        expect(reg.list()).toEqual([plugin]);
    });
    it('throws when registering duplicate name', () => {
        const reg = new PluginRegistry();
        const plugin = { name: 'bar', version: '1.0.0' };
        reg.register(plugin);
        expect(() => reg.register(plugin)).toThrow(/already registered/);
    });
    it('clears registry', () => {
        const reg = new PluginRegistry();
        reg.register({ name: 'x', version: '0' });
        reg.clear();
        expect(reg.has('x')).toBe(false);
        expect(reg.list()).toHaveLength(0);
    });
});
//# sourceMappingURL=registry.test.js.map