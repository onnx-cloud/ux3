import { LifecycleComponent } from '../../lifecycle-component.js';
import type { PrimitiveDefinition } from './types.js';
import { DEF_BY_TAG, TOGGLE_KIND } from './types.js';
import { emitReadyOnce } from './helpers.js';

export class UxBase extends LifecycleComponent {
  protected get definition(): PrimitiveDefinition | undefined {
    return DEF_BY_TAG.get(this.localName);
  }

  protected onConnected(): void {
    this.ensureRole();
    this.ensureTabIndex();
    emitReadyOnce(this);
  }

  protected ensureRole(): void {
    const role = this.definition?.role;
    if (role && !this.hasAttribute('role')) {
      this.setAttribute('role', role);
    }
  }

  protected ensureTabIndex(): void {
    const def = this.definition;
    if (!def) {
      return;
    }
    if (TOGGLE_KIND.has(def.kind) || def.kind === 'value' || def.kind === 'slider') {
      if (!this.hasAttribute('tabindex')) {
        this.tabIndex = 0;
      }
    }
  }
}
