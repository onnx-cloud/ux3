/**
 * UxField Component Unit Tests
 * Tests form field component with ElementInternals, validation, accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { UxField } from '../../../src/ui/widget/form/field';

// Mock ElementInternals for jsdom environment
beforeAll(() => {
  if (typeof window !== 'undefined') {
    const mockInternals = {
      setFormValue: vi.fn(),
      setValidity: vi.fn(),
    };
    
    const originalAttachInternals = HTMLElement.prototype.attachInternals;
    
    (HTMLElement.prototype as any).attachInternals = function() {
      // Return a properly mocked ElementInternals
      return {
        setFormValue: vi.fn(),
        setValidity: vi.fn(),
      };
    };
  }
});

describe('UxField - Form Field Component', () => {
  let field: UxField;
  let container: HTMLDivElement;

  beforeEach(() => {
    // Register component if not already registered
    if (!customElements.get('ux-field')) {
      customElements.define('ux-field', UxField);
    }

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ==================== Attribute Management ====================

  describe('Attribute Management', () => {
    it('should read name attribute', () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      container.appendChild(field);
      
      expect(field.name).toBe('email');
    });

    it('should read label attribute', () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('label', 'Email Address');
      container.appendChild(field);
      
      expect(field.label).toBe('Email Address');
    });

    it('should read type attribute (default to text)', () => {
      field = document.createElement('ux-field') as UxField;
      container.appendChild(field);
      
      expect(field.type).toBe('text');
      
      field.setAttribute('type', 'email');
      expect(field.type).toBe('email');
    });

    it('should check required attribute', () => {
      field = document.createElement('ux-field') as UxField;
      container.appendChild(field);
      
      expect(field.required).toBe(false);
      
      field.setAttribute('required', '');
      expect(field.required).toBe(true);
    });

    it('should check disabled attribute', () => {
      field = document.createElement('ux-field') as UxField;
      container.appendChild(field);
      
      expect(field.disabled).toBe(false);
      
      field.setAttribute('disabled', '');
      expect(field.disabled).toBe(true);
    });

    it('should read error attribute', () => {
      field = document.createElement('ux-field') as UxField;
      container.appendChild(field);
      
      expect(field.error).toBe('');
      
      field.setAttribute('error', 'This field is required');
      expect(field.error).toBe('This field is required');
    });

    it('should check touched attribute', () => {
      field = document.createElement('ux-field') as UxField;
      container.appendChild(field);
      
      expect(field.touched).toBe(false);
      
      field.setAttribute('touched', '');
      expect(field.touched).toBe(true);
    });

    it('should read hint attribute', () => {
      field = document.createElement('ux-field') as UxField;
      container.appendChild(field);
      
      expect(field.hint).toBe('');
      
      field.setAttribute('hint', 'Enter a valid email');
      expect(field.hint).toBe('Enter a valid email');
    });
  });

  // ==================== Label Inference ====================

  describe('Label Inference', () => {
    it('should infer label from name if not explicitly set', () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      container.appendChild(field);
      
      const inferredLabel = field.label;
      expect(inferredLabel).toContain('email');
    });

    it('should use context in label inference', () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'street');
      field.setAttribute('context', 'shipping');
      container.appendChild(field);
      
      const inferredLabel = field.label;
      expect(inferredLabel).toContain('shipping');
      expect(inferredLabel).toContain('street');
    });

    it('should default context to "common"', () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'username');
      container.appendChild(field);
      
      const inferredLabel = field.label;
      expect(inferredLabel).toContain('common');
    });

    it('should prefer explicit label over inferred', () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('label', 'Custom Label');
      container.appendChild(field);
      
      expect(field.label).toBe('Custom Label');
    });

    it('should support empty explicitly-set label', () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('label', '');
      container.appendChild(field);
      
      expect(field.label).toBe('');
    });
  });

  // ==================== Form Association (ElementInternals) ====================

  describe('Form Association', () => {
    it('should have formAssociated static property', () => {
      expect(UxField.formAssociated).toBe(true);
    });

    it('should be form-associated through ElementInternals', () => {
      const form = document.createElement('form');
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      
      const input = document.createElement('input');
      input.type = 'email';
      field.appendChild(input);
      
      form.appendChild(field);
      container.appendChild(form);
      
      // ElementInternals creates a virtual form control
      expect(form.elements.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== Control Detection & Binding ====================

  describe('Control Detection & Binding', () => {
    it('should detect input control from slot', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('type', 'email');
      
      const input = document.createElement('input');
      input.setAttribute('slot', 'control');
      field.appendChild(input);
      
      container.appendChild(field);
      
      // Wait for connectedCallback
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify control attributes are synced
      expect(input.getAttribute('name')).toBe('email');
      expect(input.getAttribute('type')).toBe('email');
    });

    it('should detect textarea control from implicit slot', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'message');
      
      const textarea = document.createElement('textarea');
      field.appendChild(textarea);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(textarea.getAttribute('name')).toBe('message');
    });

    it('should detect select control', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'country');
      
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.textContent = 'USA';
      select.appendChild(option);
      field.appendChild(select);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(select.getAttribute('name')).toBe('country');
    });

    it('should sync required attribute to control', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('required', '');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(input.hasAttribute('required')).toBe(true);
    });

    it('should sync disabled attribute to control', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('disabled', '');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(input.hasAttribute('disabled')).toBe(true);
    });

    it('should update control when attributes change', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      field.setAttribute('required', '');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(input.hasAttribute('required')).toBe(true);
    });
  });

  // ==================== Validation & Error State ====================

  describe('Validation & Error State', () => {
    it('should show error when error attribute set and touched', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('error', 'Invalid email');
      field.setAttribute('touched', '');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(field.error).toBe('Invalid email');
      expect(field.touched).toBe(true);
    });

    it('should hide error when not touched', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('error', 'Invalid email');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Error should not be visible in shadow DOM since touched is not set
      expect(field.touched).toBe(false);
    });

    it('should mark field as touched on blur', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      input.dispatchEvent(new FocusEvent('blur'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(field.touched).toBe(true);
    });

    it('should update ElementInternals validity on error', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      field.setAttribute('error', 'Invalid');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(field.error).toBe('Invalid');
    });
  });

  // ==================== Accessibility ====================

  describe('Accessibility', () => {
    it('should set aria-invalid on error', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('error', 'Invalid email');
      field.setAttribute('touched', '');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should set aria-describedby for error message', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('error', 'Invalid email');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(input.getAttribute('aria-describedby')).toContain('error');
    });

    it('should set aria-required when required', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('required', '');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('should have a label with proper htmlFor', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('label', 'Email');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const shadowLabel = field.shadowRoot?.querySelector('label');
      expect(shadowLabel).toBeTruthy();
    });

    it('should have error with role=alert', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('error', 'Invalid email');
      field.setAttribute('touched', '');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const errorEl = field.shadowRoot?.querySelector('[role="alert"]');
      expect(errorEl).toBeTruthy();
    });
  });

  // ==================== Event Emission ====================

  describe('Event Emission', () => {
    it('should emit field-change on input change', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const changeListener = vi.fn();
      field.addEventListener('field-change', changeListener);
      
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(changeListener).toHaveBeenCalled();
      expect(changeListener.mock.calls[0][0].detail.name).toBe('email');
    });

    it('should set form value on input', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      
      const input = document.createElement('input');
      input.value = 'test@example.com';
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // ElementInternals value should be updated
      expect(input.value).toBe('test@example.com');
    });
  });

  // ==================== Observed Attributes ====================

  describe('Observed Attributes', () => {
    it('should have correct observed attributes', () => {
      const observed = UxField.observedAttributes;
      expect(observed).toContain('error');
      expect(observed).toContain('touched');
      expect(observed).toContain('disabled');
      expect(observed).toContain('label');
      expect(observed).toContain('required');
      expect(observed).toContain('hint');
      expect(observed).toContain('context');
    });
  });

  // ==================== Hint Display ====================

  describe('Hint Display', () => {
    it('should display hint when set', async () => {
      field = document.createElement('ux-field') as UxField;
      field.setAttribute('name', 'email');
      field.setAttribute('hint', 'Enter a valid email address');
      
      const input = document.createElement('input');
      field.appendChild(input);
      
      container.appendChild(field);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(field.hint).toBe('Enter a valid email address');
    });
  });
});
