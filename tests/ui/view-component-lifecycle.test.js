import { describe, it, expect, beforeEach } from 'vitest';
import { ViewComponent } from '@ux3/ui/view-component.js';
import { StateMachine } from '@ux3/fsm/state-machine';
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
        }),
        // BUG-5: real app stores machines under the suffixed key '<name>FSM'
        suffixedFSM: new StateMachine({
            id: 'suffixed',
            initial: 'idle',
            states: { idle: {} }
        }),
    },
    template: (name) => {
        if (name === 'default')
            return '<div id="layout"><div id="ux-content"></div></div>';
        if (name === 'test-idle')
            return '<div id="idle-content"><button ux-event="START">Start</button></div>';
        if (name === 'test-running')
            return '<div id="running-content"><button ux-event="STOP">Stop</button></div>';
        if (name === 'suffixed-idle')
            return '<div id="suffixed-idle"></div>';
        return '';
    }
};
window.__ux3App = mockApp;
class TestView extends ViewComponent {
    constructor() {
        super();
    }
    // @ts-ignore
    setupEventListeners() { }
    // @ts-ignore
    setupReactiveEffects() { }
    // @ts-ignore
    removeEventListeners() { }
}
if (!customElements.get('ux-test')) {
    customElements.define('ux-test', TestView);
}
// BUG-5: a view whose ux-fsm attribute is 'suffixed' should fall back to 'suffixedFSM'
class SuffixedView extends ViewComponent {
    constructor() {
        super();
    }
    // @ts-ignore
    setupEventListeners() { }
    // @ts-ignore
    setupReactiveEffects() { }
    // @ts-ignore
    removeEventListeners() { }
}
if (!customElements.get('ux-suffixed')) {
    customElements.define('ux-suffixed', SuffixedView);
}
// BUG-7: a subclass that pre-populates templates should not have them overwritten
class PreloadedView extends ViewComponent {
    constructor() {
        super();
        // pre-populate before connectedCallback
        this['templates'] = new Map([['idle', '<div id="preloaded">preloaded</div>']]);
    }
    // @ts-ignore
    setupEventListeners() { }
    // @ts-ignore
    setupReactiveEffects() { }
    // @ts-ignore
    removeEventListeners() { }
}
if (!customElements.get('ux-preloaded')) {
    customElements.define('ux-preloaded', PreloadedView);
}
describe('ViewComponent - Lifecycle and Rendering', () => {
    let el;
    beforeEach(() => {
        document.body.innerHTML = '';
        // Reset FSM to idle
        const fsm = mockApp.machines.test;
        fsm.send('STOP');
        el = document.createElement('ux-test');
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
    it('BUG-5: should find FSM by "nameFSM" suffix when bare name is absent', () => {
        // machines['suffixed'] does not exist; machines['suffixedFSM'] does.
        const suffixedEl = document.createElement('ux-suffixed');
        suffixedEl.setAttribute('ux-fsm', 'suffixed');
        suffixedEl.setAttribute('ux-view', 'suffixed');
        suffixedEl.setAttribute('ux-layout', 'default');
        // Should mount without throwing even though machines['suffixed'] is undefined
        expect(() => document.body.appendChild(suffixedEl)).not.toThrow();
        expect(suffixedEl['fsm']).toBeDefined();
    });
    it('BUG-7: pre-populated templates must NOT be overwritten by loadTemplates()', () => {
        const preEl = document.createElement('ux-preloaded');
        preEl.setAttribute('ux-fsm', 'test');
        preEl.setAttribute('ux-view', 'test');
        preEl.setAttribute('ux-layout', 'default');
        document.body.appendChild(preEl);
        // The 'idle' template should still be the pre-loaded one
        const tpls = preEl['templates'];
        expect(tpls.get('idle')).toContain('preloaded');
    });
});
//# sourceMappingURL=view-component-lifecycle.test.js.map