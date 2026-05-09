import { LifecycleComponent } from '../../lifecycle-component.js';
import type { PrimitiveDefinition } from './types.js';
import { TOGGLE_KIND } from './types.js';
import { DEF_BY_TAG } from './registry.js';
import { emitReadyOnce } from './helpers.js';
import { FSMRegistry, extractNamespace, extractState } from '../../../fsm/registry.js';
import type { StateMachine } from '../../../fsm/state-machine.js';

export class UxBase extends LifecycleComponent {
  private boundFSM: StateMachine<any> | null = null;
  private fsmUnsubscribe: (() => void) | null = null;
  private fsmNamespace: string = '';
  private fsmState: string = '';
  private previousDisplay: string = '';

  protected get definition(): PrimitiveDefinition | undefined {
    return DEF_BY_TAG.get(this.localName);
  }

  protected onConnected(): void {
    this.ensureRole();
    this.ensureTabIndex();
    this.inferUxStyle();
    this.bindFSM();
    emitReadyOnce(this);
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
    if (!fsm) return;

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
    this.resolveDataBindings(context);
  }

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
