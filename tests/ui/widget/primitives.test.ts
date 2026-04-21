import { afterEach, describe, expect, it } from 'vitest';
import { registerBuiltInPrimitives } from '../../../src/ui/widget/primitives';
import '../../../src/ui/widget/index';

const BUILT_IN_TAGS = [
  'ux-app-shell',
  'ux-topbar',
  'ux-sidebar',
  'ux-breadcrumb',
  'ux-pagination',
  'ux-button',
  'ux-icon-button',
  'ux-link',
  'ux-modal',
  'ux-drawer',
  'ux-tabs',
  'ux-accordion',
  'ux-menu',
  'ux-dropdown',
  'ux-select',
  'ux-command-palette',
  'ux-tooltip',
  'ux-table',
  'ux-list',
  'ux-description-list',
  'ux-icon',
  'ux-card',
  'ux-card-icon',
  'ux-surface',
  'ux-divider',
  'ux-badge',
  'ux-avatar',
  'ux-stack',
  'ux-inline',
  'ux-grid',
  'ux-hero',
  'ux-article',
  'ux-alert',
  'ux-toast',
  'ux-progress',
  'ux-spinner',
  'ux-skeleton',
  'ux-empty-state',
  'ux-error-panel',
  'ux-form',
  'ux-field',
  'ux-input',
  'ux-textarea',
  'ux-checkbox',
  'ux-radio-group',
  'ux-switch',
  'ux-slider',
  'ux-form-errors',
  'ux-image',
  'ux-image-panel',
  'ux-image-capture',
  'ux-video',
  'ux-video-capture',
  'ux-audio',
  'ux-audio-capture',
  'ux-chart-line',
  'ux-chart-bar',
  'ux-chart-donut',
  'ux-chat-messenger',
  'ux-chat-thread-list',
  'ux-chat-composer',
  'ux-popover',
  'ux-hover-panel',
  'ux-splash-screen',
  'ux-wizard',
  'ux-lang-switcher',
  'ux-theme-toggle',
  'ux-network-status',
];

describe('Built-in primitives', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
    delete document.documentElement.dataset.theme;
    delete (window as any).__ux3App;
  });

  it('registers primitive tags', () => {
    registerBuiltInPrimitives();
    expect(customElements.get('ux-app-shell')).toBeTruthy();
    expect(customElements.get('ux-input')).toBeTruthy();
    expect(customElements.get('ux-slider')).toBeTruthy();
    expect(customElements.get('ux-chat-composer')).toBeTruthy();
  });

  it('registers all built-in ux-* components', () => {
    registerBuiltInPrimitives();
    for (const tag of BUILT_IN_TAGS) {
      expect(customElements.get(tag), `${tag} should be registered`).toBeTruthy();
    }
  });

  it('can instantiate and attach each built-in component', () => {
    registerBuiltInPrimitives();
    const nonDirectConstructTags = new Set(['ux-toast']);

    for (const tag of BUILT_IN_TAGS) {
      if (nonDirectConstructTags.has(tag)) {
        continue;
      }
      const element = document.createElement(tag);
      expect(() => document.body.appendChild(element), `attach should not throw for ${tag}`).not.toThrow();
      document.body.removeChild(element);
    }
  });

  it('renders ux-toast through ux-toast-container API', () => {
    const container = document.createElement('ux-toast-container') as any;
    document.body.appendChild(container);

    const id = container.show({ message: 'Saved', type: 'success', duration: 0 });

    expect(id).toMatch(/^toast-/);
    expect(container.shadowRoot?.querySelector('ux-toast')).toBeTruthy();
  });

  it('emits ux:ready only once per element instance', async () => {
    const el = document.createElement('ux-card');
    const calls: string[] = [];
    el.addEventListener('ux:ready', () => calls.push('ready'));

    document.body.appendChild(el);
    await Promise.resolve();

    document.body.removeChild(el);
    document.body.appendChild(el);
    await Promise.resolve();

    expect(calls).toHaveLength(1);
  });

  it('toggles ux-switch with keyboard and dispatches ux:change', () => {
    const sw = document.createElement('ux-switch');
    document.body.appendChild(sw);

    let detail: Record<string, boolean> | null = null;
    sw.addEventListener('ux:change', (event: Event) => {
      detail = (event as CustomEvent).detail;
    });

    sw.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(sw.hasAttribute('checked')).toBe(true);
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(detail?.checked).toBe(true);
  });

  it('toggles all toggle-class primitives and emits open/close lifecycle events', () => {
    const toggleTags = ['ux-drawer', 'ux-popover', 'ux-tooltip', 'ux-hover-panel', 'ux-command-palette', 'ux-image-panel', 'ux-accordion'];

    for (const tag of toggleTags) {
      const el = document.createElement(tag);
      document.body.appendChild(el);

      let opened = 0;
      let closed = 0;
      el.addEventListener('ux:open', () => {
        opened += 1;
      });
      el.addEventListener('ux:close', () => {
        closed += 1;
      });

      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(el.hasAttribute('open')).toBe(true);

      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(el.hasAttribute('open')).toBe(false);

      expect(opened).toBe(1);
      expect(closed).toBe(1);
    }
  });

  it('syncs ux-input value and emits ux:change on user input', () => {
    const input = document.createElement('ux-input');
    input.setAttribute('name', 'email');
    document.body.appendChild(input);

    let emittedValue = '';
    input.addEventListener('ux:change', (event: Event) => {
      emittedValue = (event as CustomEvent).detail.value;
    });

    const inner = input.shadowRoot?.querySelector('input') as HTMLInputElement;
    inner.value = 'user@example.com';
    inner.dispatchEvent(new Event('input', { bubbles: true }));

    expect(input.getAttribute('value')).toBe('user@example.com');
    expect(emittedValue).toBe('user@example.com');
  });

  it('updates ux-slider value with arrow keys', () => {
    const slider = document.createElement('ux-slider');
    slider.setAttribute('value', '10');
    document.body.appendChild(slider);

    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(slider.getAttribute('value')).toBe('11');
    expect(slider.getAttribute('aria-valuenow')).toBe('11');

    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(slider.getAttribute('value')).toBe('10');
  });

  it('emits ux:submit with collected field values from ux-form', () => {
    const form = document.createElement('ux-form');

    const name = document.createElement('ux-input');
    name.setAttribute('name', 'name');
    name.setAttribute('value', 'Ada');

    const bio = document.createElement('ux-textarea');
    bio.setAttribute('name', 'bio');
    bio.setAttribute('value', 'Engineer');

    form.appendChild(name);
    form.appendChild(bio);
    document.body.appendChild(form);

    let payload: Record<string, string> | null = null;
    form.addEventListener('ux:submit', (event: Event) => {
      payload = (event as CustomEvent).detail;
    });

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payload).toEqual({ name: 'Ada', bio: 'Engineer' });
  });

  it('ux-lang-switcher switches document lang and emits locale event', () => {
    (window as any).__ux3App = {
      config: { i18n: { en: {}, fr: {} } },
      browser: { locale: { primary: 'en', language: 'en', direction: 'ltr' } },
      ui: { browser: { locale: {} } },
    };

    const switcher = document.createElement('ux-lang-switcher');
    switcher.setAttribute('persist', 'false');
    document.body.appendChild(switcher);

    let locale = '';
    switcher.addEventListener('ux:locale-change', (event: Event) => {
      locale = (event as CustomEvent).detail.locale;
    });

    const select = switcher.shadowRoot?.querySelector('select') as HTMLSelectElement;
    select.value = 'fr';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.documentElement.lang).toBe('fr');
    expect(locale).toBe('fr');
  });

  it('ux-theme-toggle toggles document theme and emits theme event', () => {
    document.documentElement.dataset.theme = 'light';

    const toggle = document.createElement('ux-theme-toggle');
    toggle.setAttribute('persist', 'false');
    document.body.appendChild(toggle);

    let theme = '';
    toggle.addEventListener('ux:theme-change', (event: Event) => {
      theme = (event as CustomEvent).detail.theme;
    });

    const button = toggle.shadowRoot?.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(theme).toBe('dark');
  });

  it('ux-network-status reacts to offline/online events', () => {
    const status = document.createElement('ux-network-status');
    document.body.appendChild(status);

    const setOnline = (value: boolean) => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value,
      });
    };

    setOnline(false);
    window.dispatchEvent(new Event('offline'));
    expect(status.hasAttribute('online')).toBe(false);

    setOnline(true);
    window.dispatchEvent(new Event('online'));
    expect(status.hasAttribute('online')).toBe(true);
  });
});
