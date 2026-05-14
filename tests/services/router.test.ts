import { describe, it, expect } from 'vitest';
import { Router } from '../../src/services/router';
import type { RouteConfig } from '../../src/services/router';

describe('Router', () => {
  it('should initialize with provided routes', () => {
    const routes: RouteConfig[] = [
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
    const routes: RouteConfig[] = [
      { path: '/market/:id', view: 'market' }
    ];
    const machines = new Map();
    const router = (new Router(routes, machines) as any);
    
    const navRoutes = router.navConfig.routes;
    expect(navRoutes[0].params).toEqual(['id']);
  });

  it('should determine navigation capability', () => {
    const routes: RouteConfig[] = [
      { path: '/market', view: 'market' }
    ];
    const machines = new Map();
    machines.set('market', { getState: () => 'idle' });
    
    const router = new Router(routes, machines);
    expect(router['navConfig'].canNavigate('market')).toBe(true);
    expect(router['navConfig'].canNavigate('missing')).toBe(false);
  });

  it('should build a hierarchical nav tree from route names and i18n metadata', () => {
    const routes: RouteConfig[] = [
      { path: '/platform', view: 'platform', name: 'platform' },
      { path: '/platform/mcp', view: 'mcp', name: 'platform.mcp' },
      { path: '/about', view: 'about', name: 'about' },
    ];
    const machines = new Map();
    const i18n = {
      platform: {
        label: 'Platform',
        mcp: {
          label: 'MCP',
          icon: 'plug',
          description: 'Agent integration tools',
        },
      },
      about: {
        label: 'About',
      },
    };
    const contentManifest = {
      items: [
        {
          file: 'platform/mcp.md',
          slug: '/platform/mcp',
          frontmatter: { title: 'MCP Hub' },
          html: '<p>MCP</p>',
        },
      ],
    };

    const router = new Router(routes, machines, i18n as any, contentManifest as any);
    const nav = router.getNavConfig();

    expect(nav.tree.platform.label).toBe('Platform');
    expect(nav.tree.platform.url).toBe('/platform');
    expect(nav.tree.platform.children?.mcp.label).toBe('MCP');
    expect(nav.tree.platform.children?.mcp.title).toBe('MCP Hub');
    expect(nav.tree.platform.children?.mcp.icon).toBe('plug');
    expect(nav.tree.about.label).toBe('About');
    expect(nav.tree.about.url).toBe('/about');
  });
});
