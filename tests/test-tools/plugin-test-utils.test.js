import { describe, it, expect } from 'vitest';
import { createTestApp, mockLogger, executeHook } from '@ux3/testing/plugin-test-utils';
// a simple dummy plugin for testing
const dummy = {
    name: 'dummy',
    version: '0.1.0',
    install(app) {
        app.services.dummy = { called: true };
    },
    hooks: {
        app: {
            'ux3.app.phase.init': [ctx => ctx.app.logger?.log('dummy.init')]
        }
    }
};
describe('plugin-test-utils', () => {
    it('creates app and installs plugins', () => {
        const app = createTestApp([dummy]);
        expect(app.services.dummy).toBeDefined();
    });
    it('mockLogger captures entries and executeHook invokes', async () => {
        const app = createTestApp([dummy]);
        app.logger = mockLogger();
        await executeHook('ux3.app.phase.init', { app, phase: 'ux3.app.phase.init' });
        expect(app.logger.entries.length).toBe(1);
    });
});
//# sourceMappingURL=plugin-test-utils.test.js.map