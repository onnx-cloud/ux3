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

describe('ViewComponent layout fallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    const machine = new StateMachine<any>({
      id: 'fallback',
      initial: 'idle',
      states: { idle: {} },
    });

    (window as any).__ux3App = {
      machines: { fallbackFSM: machine },
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
  });

  afterEach(() => {
    delete (window as any).__ux3App;
    document.body.innerHTML = '';
  });

  it('renders using generated layout when app template lookup misses default', () => {
    const el = document.createElement('ux-fallback-layout-view');
    el.setAttribute('ux-fsm', 'fallback');
    el.setAttribute('ux-view', 'fallback');
    // no ux-layout override => defaults to "default", template() returns empty
    document.body.appendChild(el);

    const shadow = (el as HTMLElement).shadowRoot;
    expect(shadow).toBeTruthy();
    expect(shadow?.querySelector('#ux-content')).toBeTruthy();
    expect(shadow?.querySelector('#ok')?.textContent).toContain('Ready');
  });
});
