import { afterEach, describe, expect, it } from 'vitest';
import { registerBuiltInPrimitives } from '../../../src/ui/widget/primitives/index.js';
import { UxMegaMenu } from '../../../src/ui/widget/primitives/mega-menu.js';

describe('UxMegaMenu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).__ux3App;
  });

  it('renders top-level and nested links from nav.tree', () => {
    registerBuiltInPrimitives();
    if (!customElements.get('ux-mega-menu')) {
      customElements.define('ux-mega-menu', UxMegaMenu);
    }

    (window as any).__ux3App = {
      nav: {
        tree: {
          platform: {
            label: 'Platform',
            url: '/platform',
            children: {
              mcp: {
                label: 'MCP',
                url: '/platform/mcp',
                title: 'MCP Hub',
                icon: 'plug',
              },
            },
          },
          about: {
            label: 'About',
            url: '/about',
          },
        },
      },
    };

    const menu = document.createElement('ux-mega-menu');
    document.body.appendChild(menu);

    const links = Array.from(menu.querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(links.some((text) => text?.includes('Platform'))).toBe(true);
    expect(links).toContain('About');
    expect(links).toContain('MCP');

    const nestedLink = menu.querySelector('a[href="/platform/mcp"]');
    expect(nestedLink).toBeTruthy();
    expect(nestedLink?.textContent).toContain('MCP');
  });
});
