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
    // grab context from window
    this.ctx = (window as any).__ux3Inspector;
    if (!this.ctx) return;

    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;bottom:0;right:0;width:320px;max-height:60vh;background:rgba(0,0,0,0.85);color:#fff;font-family:monospace;font-size:12px;overflow:auto;z-index:9999;box-shadow:0 0 8px rgba(0,0,0,0.5);';

    // header with close button
    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0.5rem;background:rgba(255,255,255,0.1);cursor:move;';
    const title = document.createElement('span');
    title.textContent = 'Inspector';
    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer';
    close.addEventListener('click', () => this.remove());
    header.appendChild(title);
    header.appendChild(close);
    root.appendChild(header);

    const body = document.createElement('div');
    body.style.padding = '0.5rem';
    this.container = document.createElement('pre');
    this.container.style.margin = '0';
    body.appendChild(this.container);
    root.appendChild(body);

    this.shadowRoot!.appendChild(root);

    this.update();

    // subscribe to machines to refresh snapshot
    Object.values(this.ctx.machines).forEach((m: any) => {
      if (m && typeof m.subscribe === 'function') {
        m.subscribe(() => this.update());
      }
    });
  }

  private update(): void {
    if (!this.container || !this.ctx) return;
    try {
      const snapshot: any = {
        machines: {},
        services: Object.keys(this.ctx.services),
      };
      // machines may be stored as a Map or object
      const machinesObj:
        | Record<string, any>
        | Map<string, any> = this.ctx.machines;

      const iterate = (entries: Iterable<[string, any]>) => {
        for (const [name, machine] of entries) {
          try {
            snapshot.machines[name] = (machine as any).getState
              ? (machine as any).getState()
              : 'unknown';
          } catch {
            snapshot.machines[name] = '<error>';
          }
        }
      };

      if (machinesObj instanceof Map) {
        iterate(machinesObj.entries());
      } else {
        iterate(Object.entries(machinesObj));
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
