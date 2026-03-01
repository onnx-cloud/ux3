/**
 * Simple inspector overlay widget used in development mode.
 * The widget is loaded via the framework's widget factory and appended
 * to the page when `development.inspector` is true.
 *
 * It displays a small JSON snapshot of the current FSM states and a
 * list of registered services.  The panel updates in response to FSM
 * transitions so you can see the app evolve.
 */

import type { AppContext } from './app.js';

export default class InspectorWidget extends HTMLElement {
  private container: HTMLDivElement | null = null;
  private ctx: AppContext | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    // grab the context that was stashed on window by createAppContext
    this.ctx = (window as any).__ux3Inspector;
    if (!this.ctx) return;

    // style and container
    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;bottom:0;right:0;width:320px;height:240px;background:rgba(0,0,0,0.85);color:#fff;font-family:monospace;font-size:12px;overflow:auto;z-index:9999;padding:0.5rem;';
    this.container = document.createElement('pre');
    this.container.style.margin = '0';
    root.appendChild(this.container);
    this.shadowRoot!.appendChild(root);

    this.update();

    // subscribe to each machine to refresh snapshot on transitions
    Object.values(this.ctx.machines).forEach((m: any) => {
      if (m && typeof m.subscribe === 'function') {
        m.subscribe(() => this.update());
      }
    });

    // allow click to toggle visibility
    root.addEventListener('click', () => {
      root.style.display = root.style.display === 'none' ? 'block' : 'none';
    });
  }

  private update(): void {
    if (!this.container || !this.ctx) return;
    try {
      const snapshot: any = {
        machines: {},
        services: Object.keys(this.ctx.services),
      };
      // machines may be stored as a Map (builder) or plain object
      if (this.ctx.machines instanceof Map) {
        for (const [name, machine] of this.ctx.machines.entries()) {
          try {
            snapshot.machines[name] = (machine as any).getState
              ? (machine as any).getState()
              : 'unknown';
          } catch {
            snapshot.machines[name] = '<error>';
          }
        }
      } else {
        for (const [name, machine] of Object.entries(this.ctx.machines)) {
          try {
            snapshot.machines[name] = (machine as any).getState
              ? (machine as any).getState()
              : 'unknown';
          } catch {
            snapshot.machines[name] = '<error>';
          }
        }
      }
      this.container.textContent = JSON.stringify(snapshot, null, 2);
    } catch (e) {
      this.container.textContent = `inspector error: ${e}`;
    }
  }
}

// register with customElements so it can be used in templates if desired
if (typeof customElements !== 'undefined' && !customElements.get('ux3-inspector')) {
  customElements.define('ux3-inspector', InspectorWidget);
}
