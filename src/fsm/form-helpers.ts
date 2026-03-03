/**
 * FSM Form Helpers & Actions
 *
 * Actions for managing form state within FSM context
 * Used in FSM transitions and state entry/exit actions
 */

import type { StateEvent } from './types.js';

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
export const formActions = {
  /**
   * Update a form field value
   */
  updateFormField: (ctx: any, name: string, value: any) => {
    if (!ctx.form) ctx.form = {};
    if (!ctx.dirty) ctx.dirty = {};

    ctx.form[name] = value;
    ctx.dirty[name] = true;
    return ctx;
  },

  /**
   * Mark field as touched (user has interacted)
   */
  touchField: (ctx: any, name: string) => {
    if (!ctx.touched) ctx.touched = {};
    ctx.touched[name] = true;
    return ctx;
  },

  /**
   * Set error for a single field
   */
  setFieldError: (ctx: any, name: string, error: string) => {
    if (!ctx.errors) ctx.errors = {};

    if (error) {
      ctx.errors[name] = error;
    } else {
      delete ctx.errors[name];
    }
    return ctx;
  },

  /**
   * Set multiple field errors at once
   */
  setErrors: (ctx: any, errors: Record<string, string>) => {
    ctx.errors = errors || {};
    return ctx;
  },

  /**
   * Clear all errors
   */
  clearErrors: (ctx: any) => {
    ctx.errors = {};
    return ctx;
  },

  /**
   * Clear error for a specific field
   */
  clearFieldError: (ctx: any, name: string) => {
    if (!ctx.errors) ctx.errors = {};
    delete ctx.errors[name];
    return ctx;
  },

  /**
   * Reset form to initial state
   */
  resetForm: (ctx: any) => {
    ctx.form = {};
    ctx.errors = {};
    ctx.touched = {};
    ctx.dirty = {};
    ctx.isSubmitting = false;
    ctx.submitError = null;
    return ctx;
  },

  /**
   * Mark all fields as touched (typically on submit attempt)
   */
  touchAll: (ctx: any) => {
    if (ctx.form) {
      for (const fieldName of Object.keys(ctx.form)) {
        if (!ctx.touched) ctx.touched = {};
        ctx.touched[fieldName] = true;
      }
    }
    return ctx;
  },

  /**
   * Set submitting state
   */
  setSubmitting: (ctx: any, isSubmitting: boolean) => {
    ctx.isSubmitting = isSubmitting;
    return ctx;
  },

  /**
   * Set submit error
   */
  setSubmitError: (ctx: any, error: string | null) => {
    ctx.submitError = error;
    return ctx;
  },

  /**
   * Mark all fields as pristine (not dirty)
   */
  markPristine: (ctx: any) => {
    ctx.dirty = {};
    return ctx;
  },

  /**
   * Update entire form data
   */
  updateForm: (ctx: any, data: Record<string, any>) => {
    ctx.form = { ...ctx.form, ...data };
    if (!ctx.dirty) ctx.dirty = {};
    for (const key of Object.keys(data)) {
      ctx.dirty[key] = true;
    }
    return ctx;
  },
};

/**
 * Form guard conditions - check FSM context for conditions
 */
export const formGuards = {
  /**
   * Check if form has no errors
   */
  hasNoErrors: (ctx: any): boolean => {
    if (!ctx.errors) return true;
    return Object.values(ctx.errors).every((e) => !e);
  },

  /**
   * Check if form is dirty (has any changes)
   */
  isDirty: (ctx: any): boolean => {
    if (!ctx.dirty) return false;
    return Object.values(ctx.dirty).some(Boolean);
  },

  /**
   * Check if all fields are touched
   */
  allTouched: (ctx: any): boolean => {
    if (!ctx.form || !ctx.touched) return false;
    const formFields = Object.keys(ctx.form);
    return formFields.every((name) => ctx.touched![name]);
  },

  /**
   * Check if specific field has error
   */
  fieldHasError: (ctx: any, fieldName: string): boolean => {
    return !!(ctx.errors && ctx.errors[fieldName]);
  },

  /**
   * Check if specific field is touched
   */
  fieldIsTouched: (ctx: any, fieldName: string): boolean => {
    return !!(ctx.touched && ctx.touched[fieldName]);
  },

  /**
   * Check if form can submit (no errors, not currently submitting)
   */
  canSubmit: (ctx: any): boolean => {
    const hasNoErrors = formGuards.hasNoErrors(ctx);
    const isDirty = formGuards.isDirty(ctx);
    const isNotSubmitting = !ctx.isSubmitting;
    return hasNoErrors && isDirty && isNotSubmitting;
  },

  /**
   * Check if form is currently submitting
   */
  isSubmitting: (ctx: any): boolean => {
    return !!ctx.isSubmitting;
  },

  /**
   * Check if form has a submit error
   */
  hasSubmitError: (ctx: any): boolean => {
    return !!ctx.submitError;
  },

  /**
   * Check if field value matches another field (for password confirmation, etc)
   */
  fieldMatches: (ctx: any, fieldName: string, otherFieldName: string): boolean => {
    if (!ctx.form) return false;
    return ctx.form[fieldName] === ctx.form[otherFieldName];
  },

  /**
   * Check if field has a specific value
   */
  fieldEquals: (ctx: any, fieldName: string, value: any): boolean => {
    if (!ctx.form) return false;
    return ctx.form[fieldName] === value;
  },

  /**
   * Check if form is pristine (no changes)
   */
  isPristine: (ctx: any): boolean => {
    return !formGuards.isDirty(ctx);
  },
};
