/**
 * @ux3/widget - Widget factory system
 * 
 */

export type { WidgetConfig, WidgetFactory,  Widget } from './widget.js';

// Form components
export { UxField, UxFieldArray } from './form/index.js';

// Interaction components
export { UxModal } from './modal.js';
export { UxToastContainer, UxToast } from './toast.js';
export { UxDropdown } from './dropdown.js';

// Presentation components
export { UxButton } from './button.js';
export { UxPanel } from './panel.js';
export { registerBuiltInPrimitives } from './primitives.js';

// Compliance components
export { UxConsentBanner } from './consent-banner.js';

// Navigation components
export { UxThemeToggle } from './theme-toggle.js';
export { UxLangSwitcher } from './lang-switcher.js';
export { UxNav } from './nav-panel.js';

// Auth gate components
export { UxGateAuth } from './gate-auth.js';
export { UxGateAnon, UxGateRole, UxGateScope, UxGateFeature } from './gate-wrappers.js';
