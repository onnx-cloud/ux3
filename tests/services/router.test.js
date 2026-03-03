import { describe, it, expect } from 'vitest';
import { Router } from '@ux3/services/router.js';
describe('Router', () => {
    it('should initialize with provided routes', () => {
        const routes = [
            { path: '/', view: 'home' },
            { path: '/market', view: 'market' }
        ];
        const machines = new Map();
        const router = new Router(routes, machines);
        // Accessing private buildNavConfig result via public navConfig or similar 
        // based on implementation details if exposed
    });
    it('should parse route parameters correctly', () => {
        // router.ts:79 mentions paramMatch for /:(\w+)/g
        const routes = [
            { path: '/market/:id', view: 'market' }
        ];
        const machines = new Map();
        const router = new Router(routes, machines);
        const navRoutes = router.navConfig.routes;
        expect(navRoutes[0].params).toEqual(['id']);
    });
    it('should determine navigation capability', () => {
        const routes = [
            { path: '/market', view: 'market' }
        ];
        const machines = new Map();
        machines.set('marketFSM', { getState: () => 'idle' });
        const router = new Router(routes, machines);
        expect(router['navConfig'].canNavigate('market')).toBe(true);
        expect(router['navConfig'].canNavigate('missing')).toBe(false);
    });
});
//# sourceMappingURL=router.test.js.map