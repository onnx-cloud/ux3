/**
 * UX3 built-in primitive components.
 *
 * Components in this module are concrete, production-safe elements that provide
 * semantic roles, keyboard behavior, state events, and slot-based rendering.
 * Richer widgets like ux-button and ux-modal remain sourced from their
 * dedicated implementations and are not overridden.
 */
import { PRIMITIVES } from './types.js';
import { resolveClass } from './resolve.js';

export { UxBase } from './base.js';
export { UxRegion } from './region.js';
export { UxToggle } from './toggle.js';
export { UxAccordion } from './accordion.js';
export { UxValue } from './value.js';
export { UxSlider } from './slider.js';
export { UxInput } from './input.js';
export { UxTextarea } from './textarea.js';
export { UxForm } from './form.js';
export { UxImage, UxVideo, UxAudio } from './media.js';
export { UxWysiwyg } from './wysiwyg.js';
export { UxTabs } from './tabs.js';
export { UxMenu } from './menu.js';
export { UxPopover } from './popover.js';
export { UxTooltip } from './tooltip.js';
export { UxDrawer } from './drawer.js';
export { UxWizard } from './wizard.js';
export { UxCapture } from './capture.js';
export { UxProgress } from './progress.js';
export { UxSelect } from './select.js';
export { UxChart } from './chart.js';
export { UxLangSwitcher, UxThemeToggle, UxNetworkStatus } from './context-tools.js';
export { resolveClass } from './resolve.js';
export type { PrimitiveKind, PrimitiveDefinition } from './types.js';

export function registerBuiltInPrimitives(): void {
  for (const definition of PRIMITIVES) {
    if (!customElements.get(definition.tag)) {
      const BaseClass = resolveClass(definition.kind);
      const ElementClass = class extends BaseClass {};
      customElements.define(definition.tag, ElementClass);
    }
  }
}

registerBuiltInPrimitives();
