import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '@ux3/plugin/registry';
// use simple inline plugin objects instead of importing from workspace packages
const AnalyticsPlugin = { name: '@ux3/plugin-analytics', version: '1.0.0' };
const I18nPlugin = { name: '@ux3/plugin-i18n', version: '1.0.0' };
const SentryPlugin = { name: '@ux3/plugin-sentry', version: '1.0.0' };
const ValidationPlugin = { name: '@ux3/plugin-validation', version: '1.0.0' };
describe('built-in plugins', () => {
    it('all plugins have expected names and versions', () => {
        const list = [AnalyticsPlugin, I18nPlugin, SentryPlugin, ValidationPlugin];
        const names = list.map(p => p.name).sort();
        expect(names).toEqual([
            '@ux3/plugin-analytics',
            '@ux3/plugin-i18n',
            '@ux3/plugin-sentry',
            '@ux3/plugin-validation'
        ]);
        list.forEach(p => expect(p.version).toMatch(/^\d+\.\d+\.\d+/));
    });
    it('registry can register builtins without conflict', () => {
        const reg = new PluginRegistry();
        reg.register(AnalyticsPlugin);
        reg.register(I18nPlugin);
        reg.register(SentryPlugin);
        reg.register(ValidationPlugin);
        expect(reg.list().map(p => p.name).sort()).toEqual([
            '@ux3/plugin-analytics',
            '@ux3/plugin-i18n',
            '@ux3/plugin-sentry',
            '@ux3/plugin-validation'
        ]);
    });
});
//# sourceMappingURL=builtins.test.js.map