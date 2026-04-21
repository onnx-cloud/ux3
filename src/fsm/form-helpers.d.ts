/**
 * FSM Form Helpers & Actions
 *
 * Actions for managing form state within FSM context
 * Used in FSM transitions and state entry/exit actions
 */
/**
 * Form context interface - extend FSM context with form properties
 */
export interface FormContext {
    form?: Record<string, any>;
    errors?: Record<string, string>;
    touched?: Record<string, boolean>;
    dirty?: Record<string, boolean>;
    isSubmitting?: boolean;
    submitError?: string | null;
}
/**
 * Form action handlers - update FSM context
 */
export declare const formActions: {
    /**
     * Update a form field value
     */
    updateFormField: (ctx: any, name: string, value: any) => any;
    /**
     * Mark field as touched (user has interacted)
     */
    touchField: (ctx: any, name: string) => any;
    /**
     * Set error for a single field
     */
    setFieldError: (ctx: any, name: string, error: string) => any;
    /**
     * Set multiple field errors at once
     */
    setErrors: (ctx: any, errors: Record<string, string>) => any;
    /**
     * Clear all errors
     */
    clearErrors: (ctx: any) => any;
    /**
     * Clear error for a specific field
     */
    clearFieldError: (ctx: any, name: string) => any;
    /**
     * Reset form to initial state
     */
    resetForm: (ctx: any) => any;
    /**
     * Mark all fields as touched (typically on submit attempt)
     */
    touchAll: (ctx: any) => any;
    /**
     * Set submitting state
     */
    setSubmitting: (ctx: any, isSubmitting: boolean) => any;
    /**
     * Set submit error
     */
    setSubmitError: (ctx: any, error: string | null) => any;
    /**
     * Mark all fields as pristine (not dirty)
     */
    markPristine: (ctx: any) => any;
    /**
     * Update entire form data
     */
    updateForm: (ctx: any, data: Record<string, any>) => any;
};
/**
 * Form guard conditions - check FSM context for conditions
 */
export declare const formGuards: {
    /**
     * Check if form has no errors
     */
    hasNoErrors: (ctx: any) => boolean;
    /**
     * Check if form is dirty (has any changes)
     */
    isDirty: (ctx: any) => boolean;
    /**
     * Check if all fields are touched
     */
    allTouched: (ctx: any) => boolean;
    /**
     * Check if specific field has error
     */
    fieldHasError: (ctx: any, fieldName: string) => boolean;
    /**
     * Check if specific field is touched
     */
    fieldIsTouched: (ctx: any, fieldName: string) => boolean;
    /**
     * Check if form can submit (no errors, not currently submitting)
     */
    canSubmit: (ctx: any) => boolean;
    /**
     * Check if form is currently submitting
     */
    isSubmitting: (ctx: any) => boolean;
    /**
     * Check if form has a submit error
     */
    hasSubmitError: (ctx: any) => boolean;
    /**
     * Check if field value matches another field (for password confirmation, etc)
     */
    fieldMatches: (ctx: any, fieldName: string, otherFieldName: string) => boolean;
    /**
     * Check if field has a specific value
     */
    fieldEquals: (ctx: any, fieldName: string, value: any) => boolean;
    /**
     * Check if form is pristine (no changes)
     */
    isPristine: (ctx: any) => boolean;
};
