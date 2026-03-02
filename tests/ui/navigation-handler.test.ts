/**
 * Navigation handler unit tests
 *
 * Covers BUG-2 (views are actually mounted into #ux-content) and
 * BUG-9 (parameterised route matching e.g. /market/:exchange).
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import the internal helpers via the module's own exports
// We test them indirectly through setupNavigation / navigateTo.
import { setupNavigation, navigateTo } from '@ux3/ui/navigation-handler.js';
import type { AppContext } from '@ux3/ui/app.js';

// ---------------------------------------------------------------------------
// Minimal AppContext stub
// ---------------------------------------------------------------------------
function makeCtx(routes = [
  { path: '/', view: 'home' },
  { path: '/news', view: 'news' },
  { path: '/market/:exchange', view: 'market' },
]): AppContext {
  return {
    nav: {
      routes,
      currentPath: '/',
      canNavigate: () => true,
    },
    machines: {},
    services: {},
    plugins: [],
    template: () => '',
    i18n: {},
    widgets: {},
    styles: {},
  } as unknown as AppContext;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Provide a #ux-content mount point and register stub custom elements
  document.body.innerHTML = '<main id="ux-content"></main>';

  for (const tag of ['ux-home', 'ux-news', 'ux-market']) {
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends HTMLElement {});
    }
  }
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// BUG-2: mountView inserts an element into #ux-content
// ---------------------------------------------------------------------------

describe('BUG-2: mountView via navigateTo', () => {
  it('should insert <ux-news> into #ux-content when navigating to /news', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);
    navigateTo('/news', ctx);

    const content = document.querySelector('#ux-content');
    expect(content).not.toBeNull();
    const child = content!.firstElementChild;
    expect(child).not.toBeNull();
    expect(child!.tagName.toLowerCase()).toBe('ux-news');
  });

  it('should replace an existing view when navigating to a new route', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);
    navigateTo('/news', ctx);
    navigateTo('/', ctx);

    const content = document.querySelector('#ux-content');
    expect(content!.children.length).toBe(1);
    expect(content!.firstElementChild!.tagName.toLowerCase()).toBe('ux-home');
  });

  it('should warn but not throw when #ux-content is absent', () => {
    document.body.innerHTML = ''; // remove #ux-content
    const ctx = makeCtx();
    // Should not throw
    expect(() => navigateTo('/news', ctx)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// BUG-9: parameterised route matching
// ---------------------------------------------------------------------------

describe('BUG-9: parameterised route matching', () => {
  it('should mount the correct view for a :param route', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);
    navigateTo('/market/NASDAQ', ctx);

    const content = document.querySelector('#ux-content');
    expect(content!.firstElementChild!.tagName.toLowerCase()).toBe('ux-market');
  });

  it('should not match a :param route when the path has the wrong structure', () => {
    const ctx = makeCtx([{ path: '/market/:exchange', view: 'market' }]);
    // Call navigateTo directly without setupNavigation so there's no
    // fallback view already mounted from handleNavigationEvent.
    navigateTo('/market', ctx);      // '/market' has no exchange segment
    const content = document.querySelector('#ux-content');
    // No view should be mounted because no route matched
    expect(content!.firstElementChild).toBeNull();
  });

  it('should match multiple :param segments in the same path', () => {
    const ctx = makeCtx([{ path: '/a/:x/b/:y', view: 'detail' }]);
    if (!customElements.get('ux-detail')) {
      customElements.define('ux-detail', class extends HTMLElement {});
    }
    setupNavigation(ctx);
    navigateTo('/a/foo/b/bar', ctx);

    const content = document.querySelector('#ux-content');
    expect(content!.firstElementChild!.tagName.toLowerCase()).toBe('ux-detail');
  });
});
