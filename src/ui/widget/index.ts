/**
 * @ux3/widget - Widget factory system
 * 
 */

export type { WidgetConfig } from './widget.js';

// Form components
export { UxField, UxFieldArray } from './form/index.js';

// Interaction components
export { UxModal } from './primitives/modal.js';
export { UxToastContainer, UxToast } from './shell/toast.js';
export { UxDropdown } from './primitives/dropdown.js';

// Presentation components
export { UxButton } from './primitives/button.js';
export { UxPanel } from './primitives/panel.js';
export { registerBuiltInPrimitives } from './primitives/index.js';

// Compliance components
export { UxConsentBanner } from './shell/consent-banner.js';

// Navigation components
export { UxNav } from './shell/nav-panel.js';

// Auth gate components
export { UxGateAuth } from './shell/gate-auth.js';
export { UxGateAnon, UxGateRole, UxGateScope, UxGateFeature } from './shell/gate-wrappers.js';
