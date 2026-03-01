import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewComponent } from '../view-component.js';
import { StateMachine } from '../../fsm/state-machine.js';

// Mocking AppContext
const mockApp = {
  machines: {
    test: new StateMachine({
      id: 'test',
      initial: 'idle',
      states: {
        idle: { on: { START: 'running' } },
        running: { on: { STOP: 'idle' } }
      }
    } as any)
  },
  template: (name: string) => {
    if (name === 'default') return '<div id="layout"><div id="ux-content"></div></div>';
    if (name === 'test-idle') return '<div id="idle-content"><button ux-event="START">Start</button></div>';
    if (name === 'test-running') return '<div id="running-content"><button ux-event="STOP">Stop</button></div>';
    return '';
  }
};

(window as any).__ux3App = mockApp;

class TestView extends ViewComponent {
  constructor() {
    super();
  }
  // @ts-ignore
  protected setupEventListeners() {}
  // @ts-ignore
  protected setupReactiveEffects() {}
  // @ts-ignore
  protected removeEventListeners() {}
}

if (!customElements.get('ux-test')) {
  customElements.define('ux-test', TestView);
}

describe('ViewComponent - Lifecycle and Rendering', () => {
  let el: TestView;

  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset FSM to idle
    const fsm = mockApp.machines.test;
    fsm.send('STOP');
    
    el = document.createElement('ux-test') as TestView;
    el.setAttribute('ux-fsm', 'test');
    el.setAttribute('ux-view', 'test');
    el.setAttribute('ux-layout', 'default');
  });

  it('should mount layout and render initial state', () => {
    document.body.appendChild(el);
    
    expect(el.shadowRoot).toBeDefined();
    const idleContent = el.shadowRoot?.querySelector('#idle-content');
    expect(idleContent).not.toBeNull();
    expect(idleContent?.textContent).toBe('Start');
  });

  it('should transition and re-render on FSM change', async () => {
    document.body.appendChild(el);
    
    const fsm = mockApp.machines.test;
    fsm.send('START');

    const runningContent = el.shadowRoot?.querySelector('#running-content');
    expect(runningContent).not.toBeNull();
    expect(runningContent?.textContent).toBe('Stop');
  });

  it('should cleanup on disconnection', () => {
    document.body.appendChild(el);
    
    document.body.removeChild(el);
    expect(el['unsubscribe']).toBeNull();
  });
});
