import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.2.0';

export { UxBase } from '../../../../src/ui/widget/primitives/base.js';
export { UxRegion } from '../../../../src/ui/widget/primitives/region.js';
export { UxToggle } from '../../../../src/ui/widget/primitives/toggle.js';
export { UxForm } from '../../../../src/ui/widget/primitives/form.js';
export { UxInput } from '../../../../src/ui/widget/primitives/input.js';
export { UxTextarea } from '../../../../src/ui/widget/primitives/textarea.js';
export { UxSelect } from '../../../../src/ui/widget/primitives/select.js';
export { UxComboBox } from '../../../../src/ui/widget/primitives/combobox.js';
export type { PrimitiveKind, PrimitiveDefinition } from '../../../../src/ui/widget/primitives/types.js';
export { registerWidget, resolveWidgetMetadata, getRegisteredWidgets, clearWidgetRegistry } from '../../../../src/ui/widget/widget-registry.js';
export type { WidgetMetadata } from '../../../../src/ui/widget/widget-registry.js';
export { registerBuiltInPrimitives } from '../../../../src/ui/widget/primitives/index.js';

function registerCoreWidgets(): void {
  if (typeof window === 'undefined') return;
  if ((window as any).__ux3CoreWidgetsRegistered) return;
  registerBuiltInPrimitives();
  (window as any).__ux3CoreWidgetsRegistered = true;
}

function installCoreWidgets(_app: any): void {
  registerCoreWidgets();
}

const UxPrimitivesPlugin: Plugin = {
  name: '@ux3/ux-primitives',
  version,
  description: 'UI primitives and utility components for UX3 — canonical implementation package',
  categories: ['ui'],
  install(app) {
    installCoreWidgets(app);
  },
};

export { registerCoreWidgets, installCoreWidgets, UxPrimitivesPlugin };
export default UxPrimitivesPlugin;
