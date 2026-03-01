import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerStyles, applyStyles, initStyleRegistry, clearStyles, getRegisteredStyles } from '@ux3/ui/style-registry';
import { ViewComponent } from '@ux3/ui/view-component';

// ensure DOM APIs are available (jsdom is used by vitest)

describe('StyleRegistry', () => {
  beforeEach(() => {
    clearStyles();
    initStyleRegistry();
  });

  afterEach(() => {
    // clean up any DOM mutations
    document.body.innerHTML = '';
  });

  it('should allow styles to be registered and queried', () => {
    registerStyles({ foo: 'a b c' });
    expect(getRegisteredStyles().foo).toBe('a b c');
  });

  it('should apply registered classes to matching elements', () => {
    registerStyles({ foo: 'a b c' });
    const div = document.createElement('div');
    div.setAttribute('ux-style', 'foo');
    document.body.appendChild(div);

    applyStyles(document.body);
    expect(div.className).toBe('a b c');
  });

  it('should patch ViewComponent.mountLayout to inject styles', () => {
    registerStyles({ foo: 'x y' });

    class StubView extends ViewComponent {
      constructor() {
        super();
      }
      protected getStyles(): string {
        return '';
      }
    }

    customElements.define('test-style-view', StubView as any);
    const view = document.createElement('test-style-view') as any;
    // emulate what connectedCallback would do up to mountLayout
    view.attachShadow({ mode: 'open' });
    view.layout = '<div id="ux-layout"><div id="ux-content"><span ux-style="foo"></span></div></div>';
    view.mountLayout();

    const el = view.shadowRoot?.querySelector('[ux-style]');
    expect(el?.className).toBe('x y');
  });

  it('should apply styles on DOMContentLoaded event', () => {
    registerStyles({ bar: 'z' });
    const el = document.createElement('div');
    el.setAttribute('ux-style', 'bar');
    document.body.appendChild(el);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(el.className).toBe('z');
  });
});
