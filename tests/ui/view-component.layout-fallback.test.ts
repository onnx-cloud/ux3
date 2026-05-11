import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine';
import { ViewComponent } from '../../src/ui/view-component';

class FallbackLayoutView extends ViewComponent<any> {
  protected layout = '<div id="ux-layout"><div id="ux-content"></div></div>';
  protected templates = new Map<string, string>([['idle', '<div id="ok">Ready</div>']]);

  protected getStyles(): string {
    return '';
  }
}

class MagicLayoutSlotView extends ViewComponent<any> {
  protected layout = '<div id="ux-layout"><ux-view class="mount-slot"></ux-view></div>';
  protected templates = new Map<string, string>([['idle', '<div id="magic-ok">Ready</div>']]);

  protected getStyles(): string {
    return '';
  }
}

describe('ViewComponent layout fallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    const machine = new StateMachine<any>({
      id: 'fallback',
      initial: 'idle',
      states: { idle: {} },
    });

    (window as any).__ux3App = {
      machines: { fallback: machine },
      services: {},
      widgets: { register: () => {}, create: () => null },
      styles: {},
      ui: {},
      nav: null,
      template: () => '',
      render: (tpl: string) => tpl,
      i18n: (key: string) => key,
    };

    if (!customElements.get('ux-fallback-layout-view')) {
      customElements.define('ux-fallback-layout-view', FallbackLayoutView as any);
    }
    if (!customElements.get('ux-magic-layout-slot-view')) {
      customElements.define('ux-magic-layout-slot-view', MagicLayoutSlotView as any);
    }
  });

  afterEach(() => {
    delete (window as any).__ux3App;
    document.body.innerHTML = '';
  });

  it('renders using generated layout when app template lookup misses default', () => {
    const el = document.createElement('ux-fallback-layout-view');
    el.setAttribute('ux-fsm', 'fallback');
    el.setAttribute('ux-view', 'fallback');
    document.body.appendChild(el);

    expect(el.querySelector('#ux-layout')).toBeTruthy();
    expect(el.querySelector('#ux-content')).toBeTruthy();
    expect(el.querySelector('#ok')?.textContent).toContain('Ready');
  });

  it('supports <ux-view> layout alias for the active content mount point', () => {
    const el = document.createElement('ux-magic-layout-slot-view');
    el.setAttribute('ux-fsm', 'fallback');
    el.setAttribute('ux-view', 'fallback');
    document.body.appendChild(el);

    const mount = el.querySelector('#ux-content');

    expect(mount).toBeTruthy();
    expect(mount?.tagName).toBe('UX-CONTENT');
    expect(mount?.classList.contains('mount-slot')).toBe(true);
    expect(el.querySelector('#magic-ok')?.textContent).toContain('Ready');
  });
});
