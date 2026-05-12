import { afterEach, describe, expect, it } from 'vitest';
import { registerBuiltInPrimitives } from '../../../src/ui/widget/primitives/index';
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
  'ux-tab',
  'ux-accordion',
  'ux-menu',
  'ux-dropdown',
  'ux-select',
  'ux-command-palette',
  'ux-tooltip',
  'ux-search-input',
  'ux-search-tags',
  'ux-search-results',
  'ux-table',
  'ux-list',
  'ux-description-list',
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
  'ux-chat-messenger',
  'ux-chat-thread-list',
  'ux-chat-bubble',
  'ux-chat-roster',
  'ux-popover',
  'ux-hover-panel',
  'ux-splash',
  'ux-splash-screen',
  'ux-wizard',
  'ux-wysiwyg',
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
    const toggleTags = ['ux-drawer', 'ux-popover', 'ux-tooltip', 'ux-accordion'];

    for (const tag of toggleTags) {
      const el = document.createElement(tag);
      document.body.appendChild(el);

      let opened = 0;
      let closed = 0;
      el.addEventListener('ux:event', ((e: CustomEvent) => {
        if (e.detail?.action === 'OPEN') opened += 1;
        if (e.detail?.action === 'CLOSE') closed += 1;
      }) as EventListener);

      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(el.hasAttribute('open'), `${tag}: open after click`).toBe(true);

      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(el.hasAttribute('open'), `${tag}: close after click`).toBe(false);

      expect(opened, `${tag}: OPEN count`).toBe(1);
      expect(closed, `${tag}: CLOSE count`).toBe(1);

      document.body.removeChild(el);
    }
  });

  it('applies drawer position variants and renders closable controls', () => {
    const drawer = document.createElement('ux-drawer');
    document.body.appendChild(drawer);

    expect(drawer.classList.contains('drawer-right')).toBe(true);

    drawer.setAttribute('position', 'left');
    expect(drawer.classList.contains('drawer-left')).toBe(true);
    expect(drawer.classList.contains('drawer-right')).toBe(false);

    drawer.setAttribute('position', 'top');
    expect(drawer.classList.contains('drawer-top')).toBe(true);

    drawer.setAttribute('position', 'bottom');
    expect(drawer.classList.contains('drawer-bottom')).toBe(true);

    drawer.setAttribute('closable', '');
    expect(drawer.querySelector('button.close-button')).toBeTruthy();

    const closeButton = drawer.querySelector('button.close-button') as HTMLButtonElement;
    let closed = false;
    drawer.addEventListener('ux:event', (event: Event) => {
      if ((event as CustomEvent).detail?.action === 'CLOSE') closed = true;
    });

    drawer.setAttribute('open', '');
    closeButton.click();

    expect(drawer.hasAttribute('open')).toBe(false);
    expect(closed).toBe(true);
  });

  it('closes ux-drawer with a swipe gesture', () => {
    const PointerEventCtor = (window as any).PointerEvent || MouseEvent;
    const createPointerEvent = (type: string, init: Record<string, any>) => {
      const event = new PointerEventCtor(type, init);
      for (const key of Object.keys(init)) {
        if (!(key in event)) {
          (event as any)[key] = init[key];
          continue;
        }
        try {
          Object.defineProperty(event, key, {
            value: init[key],
            configurable: true,
            writable: true,
          });
        } catch {
          // ignore non-configurable properties
        }
      }
      return event;
    };

    const drawer = document.createElement('ux-drawer');
    drawer.setAttribute('open', '');
    document.body.appendChild(drawer);

    Object.defineProperty(window, 'innerWidth', { value: 420, configurable: true });

    let closed = false;
    drawer.addEventListener('ux:event', (event: Event) => {
      if ((event as CustomEvent).detail?.action === 'CLOSE') closed = true;
    });

    drawer.dispatchEvent(createPointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 1,
      clientX: 400,
      clientY: 150,
      pointerType: 'touch',
      isPrimary: true,
    }));

    window.dispatchEvent(createPointerEvent('pointerup', {
      bubbles: true,
      pointerId: 1,
      clientX: 320,
      clientY: 150,
      pointerType: 'touch',
      isPrimary: true,
    }));

    expect(drawer.hasAttribute('open')).toBe(false);
    expect(closed).toBe(true);
  });

  it('opens ux-drawer with an edge swipe gesture', () => {
    const PointerEventCtor = (window as any).PointerEvent || MouseEvent;
    const createPointerEvent = (type: string, init: Record<string, any>) => {
      const event = new PointerEventCtor(type, init);
      for (const key of Object.keys(init)) {
        if (!(key in event)) {
          (event as any)[key] = init[key];
          continue;
        }
        try {
          Object.defineProperty(event, key, {
            value: init[key],
            configurable: true,
            writable: true,
          });
        } catch {
          // ignore non-configurable properties
        }
      }
      return event;
    };

    const drawer = document.createElement('ux-drawer');
    document.body.appendChild(drawer);

    Object.defineProperty(window, 'innerWidth', { value: 420, configurable: true });

    let opened = false;
    drawer.addEventListener('ux:event', (event: Event) => {
      if ((event as CustomEvent).detail?.action === 'OPEN') opened = true;
    });

    window.dispatchEvent(createPointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 2,
      clientX: 412,
      clientY: 150,
      pointerType: 'touch',
      isPrimary: true,
    }));

    window.dispatchEvent(createPointerEvent('pointerup', {
      bubbles: true,
      pointerId: 2,
      clientX: 324,
      clientY: 150,
      pointerType: 'touch',
      isPrimary: true,
    }));

    expect(drawer.hasAttribute('open')).toBe(true);
    expect(opened).toBe(true);
  });

  it('toggles ux-tooltip on click and closes on outside click', async () => {
    const tooltip = document.createElement('ux-tooltip');
    tooltip.innerHTML = '<button ux-tooltip-trigger>Trigger</button><span>Tip</span>';
    document.body.appendChild(tooltip);
    await Promise.resolve();

    const trigger = tooltip.querySelector('button') as HTMLElement;
    trigger.click();

    expect(tooltip.hasAttribute('open')).toBe(true);
    document.body.click();
    expect(tooltip.hasAttribute('open')).toBe(false);
  });

  it('closes ux-command-palette when clicking backdrop', async () => {
    const palette = document.createElement('ux-command-palette');
    document.body.appendChild(palette);
    await Promise.resolve();

    palette.setAttribute('open', '');
    await Promise.resolve();

    const backdrop = palette.shadowRoot?.querySelector('.backdrop') as HTMLElement;
    backdrop.click();

    expect(palette.hasAttribute('open')).toBe(false);
  });

  it('syncs ux-input value and emits ux:change on user input', () => {
    const input = document.createElement('ux-input');
    input.setAttribute('name', 'email');
    document.body.appendChild(input);

    let emittedValue = '';
    input.addEventListener('ux:change', (event: Event) => {
      emittedValue = (event as CustomEvent).detail.value;
    });

    const inner = input.querySelector('input') as HTMLInputElement;
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
    let currentLocale = 'en';
    const localeService = {
      get locale() { return { primary: currentLocale, language: currentLocale.split('-')[0], direction: 'ltr' }; },
      get supportedLocales() { return ['en', 'fr']; },
      setLocale(locale: string) { currentLocale = locale; },
      onChange() { return () => {}; },
    };
    (window as any).__ux3App = {
      config: { i18n: { en: {}, fr: {} } },
      browser: { locale: { primary: 'en', language: 'en', direction: 'ltr' } },
      ui: { browser: { locale: {} } },
      locale: localeService,
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
