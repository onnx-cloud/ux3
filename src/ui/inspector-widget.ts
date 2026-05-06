/**
 * Legacy Inspector Widget Shim
 *
 * This file remains only as a compatibility placeholder while dev tools move
 * to plugin-owned declarative UX assets. The old imperative inspector shell,
 * panels, and inline styles are intentionally retired.
 */

import { LifecycleComponent } from './lifecycle-component.js';

export default class InspectorWidget extends LifecycleComponent {
  protected onConnected(): void {
    // No-op by design. Runtime dev tooling is provided by @ux3/plugin-dev-tools.
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux3-inspector')) {
  customElements.define('ux3-inspector', InspectorWidget);
}
