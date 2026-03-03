/**
 * UX3 Forms Plugin
 *
 * Provides:
 * - UxField and UxFieldArray web components
 * - RuleEngine for form validation
 * - FSM form helpers and guards
 * - Form utilities and services
 */

import { UxField, UxFieldArray } from '../ui/widget/form/index.js';
import { RuleEngine } from '../validation/rule-engine.js';
import { rules } from '../validation/rule-library.js';
import { formActions, formGuards } from '../fsm/form-helpers.js';

export interface FormPluginConfig {
  // Enable auto-registration of form components
  autoRegister?: boolean;
  // Default debounce time for async validation
  defaultDebounce?: number;
}

/**
 * Form Plugin Factory
 */
export const FormPlugin = {
  name: 'ux3-forms',

  install(app: any, config: FormPluginConfig = {}) {
    // Auto-register form components
    if (config.autoRegister !== false) {
      if (!customElements.get('ux-field')) {
        customElements.define('ux-field', UxField);
      }
      if (!customElements.get('ux-field-array')) {
        customElements.define('ux-field-array', UxFieldArray);
      }
    }

    // Create global form utilities available to app
    const formUtils = {
      RuleEngine,
      rules,
      formActions,
      formGuards,
      createValidator: (schema: any, config?: any) => {
        const engine = new RuleEngine();
        return {
          engine,
          validate: (data: any) => engine.validateForm(data, schema),
          validateField: (name: string, value: any) =>
            engine.validateField(name, value, schema[name] || [], data),
          validateFieldDebounced: (name: string, value: any, context?: any) =>
            engine.validateFieldDebounced(name, value, schema[name] || [], context),
        };
      },
    };

    // Make form utilities globally available
    if (app && app.config && app.config.globalProperties) {
      app.config.globalProperties.$forms = formUtils;
    }

    // For non-Vue apps, attach to window
    if (typeof window !== 'undefined') {
      (window as any).UX3Forms = formUtils;
    }

    return {
      formUtils,
    };
  },
};

// Export everything
export { UxField, UxFieldArray };
export { RuleEngine };
export { rules };
export { formActions, formGuards };
export type { FormContext } from '../fsm/form-helpers.js';
export type { ValidationRule, ValidationResult, FieldValidationResult } from '../validation/rule-engine.js';
