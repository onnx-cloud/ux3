/**
 * Navigation handler unit tests
 *
 * Covers BUG-2 (views are actually mounted into #ux-content) and
 * BUG-9 (parameterised route matching e.g. /market/:exchange).
 *
 * Extended suite covers:
 *  - window.history.pushState is called with correct args
 *  - popstate event triggers re-navigation to current URL
 *  - Anchor <a> click is intercepted by setupNavigation
 *  - External / hash / disabled links are NOT intercepted
 *  - canNavigate() returning false blocks all navigation
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the internal helpers via the module's own exports
// We test them indirectly through setupNavigation / navigateTo.
import { setupNavigation, navigateTo } from '../../src/ui/navigation-handler.ts';
import type { AppContext } from '../../src/ui/app.ts';

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

// ---------------------------------------------------------------------------
// History API: pushState
// ---------------------------------------------------------------------------

describe('navigateTo: window.history.pushState', () => {
  it('calls pushState with the correct path and view on navigation', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const ctx = makeCtx();
    setupNavigation(ctx);

    navigateTo('/news', ctx);

    expect(pushState).toHaveBeenCalledWith(
      expect.objectContaining({ view: 'news', path: '/news' }),
      '',
      '/news'
    );
    pushState.mockRestore();
  });

  it('does NOT call pushState when no route matches', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const ctx = makeCtx();

    navigateTo('/no-such-route', ctx);

    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it('does NOT call pushState when canNavigate returns false', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const ctx = makeCtx();
    ctx.nav!.canNavigate = () => false;

    navigateTo('/news', ctx);

    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// History API: popstate (browser back / forward)
// ---------------------------------------------------------------------------

describe('setupNavigation: popstate event triggers re-mount', () => {
  it('re-mounts the view matching window.location.pathname on popstate', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);

    // Simulate the browser updating the URL (as it does during back/forward)
    window.history.pushState({}, '', '/news');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const content = document.querySelector('#ux-content');
    expect(content!.firstElementChild!.tagName.toLowerCase()).toBe('ux-news');
  });

  it('replaces the mounted view when popstate fires with a different path', () => {
    const ctx = makeCtx();
    setupNavigation(ctx); // mounts / → ux-home initially

    window.history.pushState({}, '', '/news');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(document.querySelector('#ux-content')!.firstElementChild!.tagName.toLowerCase()).toBe('ux-news');

    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(document.querySelector('#ux-content')!.firstElementChild!.tagName.toLowerCase()).toBe('ux-home');
  });
});

// ---------------------------------------------------------------------------
// Link interception: anchor click
// ---------------------------------------------------------------------------

describe('setupNavigation: <a> click interception', () => {
  it('intercepts a local anchor click and navigates without a page reload', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);

    const a = document.createElement('a');
    a.href = '/news';
    a.textContent = 'News';
    document.body.appendChild(a);

    a.click();

    const content = document.querySelector('#ux-content');
    expect(content!.firstElementChild!.tagName.toLowerCase()).toBe('ux-news');
    expect(window.location.pathname).toBe('/news');
  });

  it('does NOT intercept a link starting with "http" (external)', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);

    // Capture initial state
    const before = document.querySelector('#ux-content')!.innerHTML;

    const a = document.createElement('a');
    a.href = 'https://example.com/page';
    document.body.appendChild(a);
    // jsdom won't actually navigate, but the handler should skip it
    a.click();

    // #ux-content must not have changed due to this click
    expect(document.querySelector('#ux-content')!.innerHTML).toBe(before);
  });

  it('does NOT intercept a hash-only link', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);

    const before = document.querySelector('#ux-content')!.innerHTML;

    const a = document.createElement('a');
    a.href = '#section';
    document.body.appendChild(a);
    a.click();

    expect(document.querySelector('#ux-content')!.innerHTML).toBe(before);
  });

  it('does NOT intercept an anchor with the "disabled" attribute', () => {
    const ctx = makeCtx();
    setupNavigation(ctx);

    const before = document.querySelector('#ux-content')!.innerHTML;

    const a = document.createElement('a');
    a.href = '/news';
    a.setAttribute('disabled', '');
    document.body.appendChild(a);
    a.click();

    expect(document.querySelector('#ux-content')!.innerHTML).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// canNavigate guard
// ---------------------------------------------------------------------------

describe('canNavigate guard', () => {
  it('prevents mounting when canNavigate returns false', () => {
    const ctx = makeCtx();
    ctx.nav!.canNavigate = () => false;

    navigateTo('/news', ctx);

    const content = document.querySelector('#ux-content');
    // canNavigate=false → no view mounted
    expect(content!.firstElementChild).toBeNull();
  });

  it('allows mounting when canNavigate returns true', () => {
    const ctx = makeCtx();
    ctx.nav!.canNavigate = () => true;

    navigateTo('/news', ctx);

    const content = document.querySelector('#ux-content');
    expect(content!.firstElementChild!.tagName.toLowerCase()).toBe('ux-news');
  });

  it('can block specific views while allowing others', () => {
    const ctx = makeCtx();
    ctx.nav!.canNavigate = (view: string) => view !== 'market';

    navigateTo('/market/NYSE', ctx);
    expect(document.querySelector('#ux-content')!.firstElementChild).toBeNull();

    navigateTo('/news', ctx);
    expect(document.querySelector('#ux-content')!.firstElementChild!.tagName.toLowerCase()).toBe('ux-news');
  });
});
