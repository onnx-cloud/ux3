import { LifecycleComponent } from '../../lifecycle-component.js';
import type { PrimitiveDefinition } from './types.js';
import { TOGGLE_KIND } from './types.js';
import { DEF_BY_TAG } from './registry.js';
import { emitReadyOnce } from './helpers.js';
import { FSMRegistry, extractNamespace, extractState } from '../../../fsm/registry.js';
import type { StateMachine } from '../../../fsm/state-machine.js';

function resolveDotPath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) =>
    (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

export class UxBase extends LifecycleComponent {
  private boundFSM: StateMachine<any> | null = null;
  private fsmUnsubscribe: (() => void) | null = null;
  private fsmNamespace: string = '';
  private fsmState: string = '';
  private previousDisplay: string = '';
  protected _boundDataRef: any = undefined;

  protected get definition(): PrimitiveDefinition | undefined {
    return DEF_BY_TAG.get(this.localName);
  }

  protected onConnected(): void {
    this.ensureRole();
    this.ensureTabIndex();
    this.inferUxStyle();
    this.bindTwoWay();
    queueMicrotask(() => {
      this.bindFSM();
      this.resolveDataFrom();
    });
    emitReadyOnce(this);
  }

  private bindTwoWay(): void {
    this.addEventListener('ux:change', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !this.boundFSM) return;
      const key = this.resolveDataKey();
      if (!key) return;
      const value = detail.value !== undefined ? detail.value : detail[key];
      if (value !== undefined) {
        this.boundFSM.setState({ [key]: value });
      }
    });
  }

  private resolveDataKey(): string | null {
    const dataFrom = this.getAttribute('data-from');
    if (dataFrom) return dataFrom.split('.')[0];
    const name = this.getAttribute('name');
    if (name) return name;
    return null;
  }

  private inferUxStyle(): void {
    if (this.hasAttribute('ux-style') || this.hasAttribute('data-style')) return;
    this.setAttribute('ux-style', this.localName);
  }

  protected onDisconnected(): void {
    if (this.fsmUnsubscribe) {
      this.fsmUnsubscribe();
      this.fsmUnsubscribe = null;
    }
  }

  private bindFSM(): void {
    const uxState = this.getAttribute('ux-state');
    if (!uxState) return;

    this.fsmNamespace = extractNamespace(uxState);
    this.fsmState = extractState(uxState);

    const fsm = FSMRegistry.get(this.fsmNamespace);
    if (!fsm) {
      const devTools = (window as any).__ux3DevTools;
      if (devTools) {
        const registered = FSMRegistry.list();
        devTools.emit('ux-base', 'fsm-not-found', {
          tag: this.localName,
          namespace: this.fsmNamespace,
          uxState,
          registered,
          hint: registered.length === 0
            ? 'No FSMs registered. Check that withMachines() ran before widgets mount.'
            : `Registered: ${registered.join(', ')}. The FSM may be registered under a different key (e.g., "${this.fsmNamespace}FSM").`,
        });
      }
      return;
    }

    this.boundFSM = fsm;
    this.fsmUnsubscribe = fsm.subscribe((state, context) => {
      this.onFSMContext(state, context);
    });

    const context = fsm.getContext();
    this.onFSMContext(fsm.getState(), context as Record<string, any>);
  }

  protected onFSMContext(state: string, context: Record<string, any>): void {
    const match = this.boundFSM
      ? (this.boundFSM.matches(this.fsmState) || this.boundFSM.matchesPath(this.fsmState))
      : false;

    if (this.previousDisplay === '') {
      this.previousDisplay = this.style.display || '';
    }

    this.style.display = match ? this.previousDisplay : 'none';
    this.resolveDataFrom(context);
    this.resolveDataBindings(context);
  }

  /**
   * Resolve data-from or data-source binding.
   * Priority: data-from (FSM context) > name (FSM context alias) > data-source (service) > slotted children.
   */
  private resolveDataFrom(context?: Record<string, any>): void {
    let dataFrom = this.getAttribute('data-from');
    if (!dataFrom && context) {
      const name = this.getAttribute('name');
      if (name && name in context) dataFrom = name;
    }
    if (dataFrom && context) {
      const value = resolveDotPath(context, dataFrom);
      if (value !== undefined && value !== this._boundDataRef) {
        this._boundDataRef = value;
        this.applyData(value);
      }
      return;
    }

    if (!context) {
      const dataSource = this.getAttribute('data-source');
      const dataMethod = this.getAttribute('data-method');
      if (dataSource && dataMethod) {
        this.resolveDataFromSource(dataSource, dataMethod);
        return;
      }
    }
  }

  /**
   * Fetch data from a named service.
   * Called once at onConnected() when data-from is absent but data-source is set.
   */
  private async resolveDataFromSource(source: string, method: string): Promise<void> {
    try {
      const app = (window as any).__ux3App;
      const svc = app?.services?.[source];
      if (!svc) return;

      let params: any = {};
      const rawParams = this.getAttribute('data-params');
      if (rawParams) {
        try { params = JSON.parse(rawParams); } catch {}
      }

      const result = await svc.execute({ method, params });
      if (result !== undefined && result !== this._boundDataRef) {
        this._boundDataRef = result;
        this.applyData(result);
      }
    } catch {}
  }

  /**
   * Override in subclass to handle data binding.
   * Receives the resolved data object (from data-from or data-source).
   */
  protected applyData(_data: any): void {}

  sendToFSM(type: string, payload?: Record<string, any>): void {
    if (!this.boundFSM) return;
    this.boundFSM.send({ type, payload: payload || {} });
  }

  private resolveDataBindings(context: Record<string, any>): void {
    const elements = this.querySelectorAll('[data-bind]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-bind');
      if (!key || !(key in context)) return;
      const value = context[key];
      if (el instanceof HTMLInputElement) {
        el.value = String(value);
      } else if (el instanceof HTMLElement) {
        el.textContent = String(value);
      }
    });
  }

  protected ensureRole(): void {
    const role = this.definition?.role;
    if (role && !this.hasAttribute('role')) {
      this.setAttribute('role', role);
    }
  }

  protected ensureTabIndex(): void {
    const def = this.definition;
    if (!def) return;
    if (TOGGLE_KIND.has(def.kind) || def.kind === 'value' || def.kind === 'slider') {
      if (!this.hasAttribute('tabindex')) {
        this.tabIndex = 0;
      }
    }
  }
}
