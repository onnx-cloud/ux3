/**
 * Test suite for FSM form helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { formActions, formGuards } from '../../../src/fsm/form-helpers.js';

describe('Form Actions', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {};
  });

  describe('updateFormField', () => {
    it('should update field value', () => {
      formActions.updateFormField(ctx, 'email', 'user@example.com');
      expect(ctx.form.email).toBe('user@example.com');
      expect(ctx.dirty.email).toBe(true);
    });

    it('should initialize form object if needed', () => {
      formActions.updateFormField(ctx, 'name', 'John');
      expect(ctx.form).toBeDefined();
      expect(ctx.dirty).toBeDefined();
    });
  });

  describe('touchField', () => {
    it('should mark field as touched', () => {
      formActions.touchField(ctx, 'email');
      expect(ctx.touched.email).toBe(true);
    });
  });

  describe('setFieldError', () => {
    it('should set error for field', () => {
      formActions.setFieldError(ctx, 'email', 'Invalid email');
      expect(ctx.errors.email).toBe('Invalid email');
    });

    it('should clear error when empty string', () => {
      ctx.errors = { email: 'Invalid email' };
      formActions.setFieldError(ctx, 'email', '');
      expect(ctx.errors.email).toBeUndefined();
    });
  });

  describe('setErrors', () => {
    it('should set multiple errors', () => {
      const errors = { email: 'Invalid', password: 'Too short' };
      formActions.setErrors(ctx, errors);
      expect(ctx.errors).toEqual(errors);
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      ctx.errors = { email: 'Invalid', password: 'Too short' };
      formActions.clearErrors(ctx);
      expect(ctx.errors).toEqual({});
    });
  });

  describe('resetForm', () => {
    it('should reset entire form state', () => {
      ctx.form = { email: 'user@example.com' };
      ctx.errors = { email: 'Invalid' };
      ctx.touched = { email: true };
      ctx.dirty = { email: true };
      ctx.isSubmitting = true;
      ctx.submitError = 'Server error';

      formActions.resetForm(ctx);

      expect(ctx.form).toEqual({});
      expect(ctx.errors).toEqual({});
      expect(ctx.touched).toEqual({});
      expect(ctx.dirty).toEqual({});
      expect(ctx.isSubmitting).toBe(false);
      expect(ctx.submitError).toBeNull();
    });
  });

  describe('touchAll', () => {
    it('should mark all fields as touched', () => {
      ctx.form = { email: 'user@example.com', password: 'secret' };
      formActions.touchAll(ctx);

      expect(ctx.touched.email).toBe(true);
      expect(ctx.touched.password).toBe(true);
    });
  });

  describe('setSubmitting', () => {
    it('should set submitting state', () => {
      formActions.setSubmitting(ctx, true);
      expect(ctx.isSubmitting).toBe(true);

      formActions.setSubmitting(ctx, false);
      expect(ctx.isSubmitting).toBe(false);
    });
  });

  describe('updateForm', () => {
    it('should merge form data', () => {
      ctx.form = { email: 'old@example.com' };
      ctx.dirty = {};

      formActions.updateForm(ctx, { email: 'new@example.com', name: 'John' });

      expect(ctx.form.email).toBe('new@example.com');
      expect(ctx.form.name).toBe('John');
      expect(ctx.dirty.email).toBe(true);
      expect(ctx.dirty.name).toBe(true);
    });
  });
});

describe('Form Guards', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      form: { email: 'user@example.com', password: 'secret' },
      errors: {},
      touched: { email: true },
      dirty: { email: true },
      isSubmitting: false,
      submitError: null,
    };
  });

  describe('hasNoErrors', () => {
    it('should return true when no errors', () => {
      expect(formGuards.hasNoErrors(ctx)).toBe(true);
    });

    it('should return false when errors exist', () => {
      ctx.errors = { email: 'Invalid' };
      expect(formGuards.hasNoErrors(ctx)).toBe(false);
    });

    it('should return true when errors object missing', () => {
      delete ctx.errors;
      expect(formGuards.hasNoErrors(ctx)).toBe(true);
    });
  });

  describe('isDirty', () => {
    it('should return true when fields are dirty', () => {
      expect(formGuards.isDirty(ctx)).toBe(true);
    });

    it('should return false when no dirty fields', () => {
      ctx.dirty = {};
      expect(formGuards.isDirty(ctx)).toBe(false);
    });
  });

  describe('allTouched', () => {
    it('should return true when all fields touched', () => {
      ctx.touched = { email: true, password: true };
      expect(formGuards.allTouched(ctx)).toBe(true);
    });

    it('should return false when not all fields touched', () => {
      ctx.touched = { email: true, password: false };
      expect(formGuards.allTouched(ctx)).toBe(false);
    });
  });

  describe('fieldHasError', () => {
    it('should return true for field with error', () => {
      ctx.errors = { email: 'Invalid' };
      expect(formGuards.fieldHasError(ctx, 'email')).toBe(true);
    });

    it('should return false for field without error', () => {
      ctx.errors = { password: 'Too short' };
      expect(formGuards.fieldHasError(ctx, 'email')).toBe(false);
    });
  });

  describe('fieldIsTouched', () => {
    it('should return true for touched field', () => {
      expect(formGuards.fieldIsTouched(ctx, 'email')).toBe(true);
    });

    it('should return false for untouched field', () => {
      expect(formGuards.fieldIsTouched(ctx, 'password')).toBe(false);
    });
  });

  describe('canSubmit', () => {
    it('should return true when form is ready to submit', () => {
      ctx.dirty = { email: true };
      ctx.errors = {};
      ctx.isSubmitting = false;

      expect(formGuards.canSubmit(ctx)).toBe(true);
    });

    it('should return false when form has errors', () => {
      ctx.errors = { email: 'Invalid' };
      expect(formGuards.canSubmit(ctx)).toBe(false);
    });

    it('should return false when form is currently submitting', () => {
      ctx.isSubmitting = true;
      expect(formGuards.canSubmit(ctx)).toBe(false);
    });

    it('should return false when form is pristine', () => {
      ctx.dirty = {};
      expect(formGuards.canSubmit(ctx)).toBe(false);
    });
  });

  describe('fieldMatches', () => {
    it('should return true when fields match', () => {
      ctx.form = { password: 'secret', confirmPassword: 'secret' };
      expect(formGuards.fieldMatches(ctx, 'password', 'confirmPassword')).toBe(true);
    });

    it('should return false when fields do not match', () => {
      ctx.form = { password: 'secret', confirmPassword: 'different' };
      expect(formGuards.fieldMatches(ctx, 'password', 'confirmPassword')).toBe(false);
    });
  });

  describe('fieldEquals', () => {
    it('should return true when field has specific value', () => {
      ctx.form = { country: 'US' };
      expect(formGuards.fieldEquals(ctx, 'country', 'US')).toBe(true);
    });

    it('should return false when field has different value', () => {
      ctx.form = { country: 'US' };
      expect(formGuards.fieldEquals(ctx, 'country', 'CA')).toBe(false);
    });
  });

  describe('isPristine', () => {
    it('should return true when form is pristine', () => {
      ctx.dirty = {};
      expect(formGuards.isPristine(ctx)).toBe(true);
    });

    it('should return false when form is dirty', () => {
      expect(formGuards.isPristine(ctx)).toBe(false);
    });
  });
});
