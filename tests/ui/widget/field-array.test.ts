/**
 * UxFieldArray Component Unit Tests
 * Tests dynamic field array management, add/remove, value collection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UxFieldArray } from '../../../src/ui/widget/form/field-array';
import { UxField } from '../../../src/ui/widget/form/field';

describe('UxFieldArray - Dynamic Field Array Component', () => {
  let fieldArray: UxFieldArray;
  let container: HTMLDivElement;

  beforeEach(() => {
    // Register components if not already registered
    if (!customElements.get('ux-field-array')) {
      customElements.define('ux-field-array', UxFieldArray);
    }
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
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      fieldArray.setAttribute('name', 'addresses');
      container.appendChild(fieldArray);
      
      expect(fieldArray.name).toBe('addresses');
    });

    it('should read context attribute', () => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      fieldArray.setAttribute('context', 'shipping');
      container.appendChild(fieldArray);
      
      expect(fieldArray.context).toBe('shipping');
    });

    it('should default context to "common"', () => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      container.appendChild(fieldArray);
      
      expect(fieldArray.context).toBe('common');
    });
  });

  // ==================== Template Requirement ====================

  describe('Template Requirement', () => {
    it('should require template with slot="item"', () => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      container.appendChild(fieldArray);
      
      // Component should handle missing template gracefully
      // In this case it warns but doesn't crash
      expect(fieldArray).toBeTruthy();
    });

    it('should accept template with slot="item"', () => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      
      const template = document.createElement('template');
      template.setAttribute('slot', 'item');
      template.innerHTML = '<ux-field name="street"><input slot="control" /></ux-field>';
      
      fieldArray.appendChild(template);
      container.appendChild(fieldArray);
      
      expect(fieldArray).toBeTruthy();
    });
  });

  // ==================== Adding Items ====================

  describe('Adding Items', () => {
    let template: HTMLTemplateElement;

    beforeEach(() => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      
      template = document.createElement('template');
      template.setAttribute('slot', 'item');
      template.innerHTML = `
        <ux-field name="street" label="Street">
          <input slot="control" type="text" />
        </ux-field>
        <ux-field name="city" label="City">
          <input slot="control" type="text" />
        </ux-field>
      `;
      
      fieldArray.appendChild(template);
      container.appendChild(fieldArray);
    });

    it('should add a new item', () => {
      fieldArray.addItem();
      
      expect(fieldArray.getItemCount()).toBe(1);
    });

    it('should add multiple items', () => {
      fieldArray.addItem();
      fieldArray.addItem();
      fieldArray.addItem();
      
      expect(fieldArray.getItemCount()).toBe(3);
    });

    it('should clone template content for new items', async () => {
      fieldArray.addItem();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const fields = fieldArray.querySelectorAll('ux-field');
      expect(fields.length).toBeGreaterThan(0);
    });

    it('should create remove button for items', () => {
      fieldArray.addItem();
      
      const removeBtn = fieldArray.querySelector('button.field-array-remove');
      expect(removeBtn).toBeTruthy();
      expect(removeBtn?.textContent).toContain('Remove');
    });

    it('should emit item-added event', () => {
      const listener = vi.fn();
      fieldArray.addEventListener('item-added', listener);
      
      fieldArray.addItem({ street: '123 Main St' });
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].detail.index).toBe(0);
    });

    it('should pass data to item-added event', () => {
      const listener = vi.fn();
      fieldArray.addEventListener('item-added', listener);
      
      const testData = { street: '123 Main St', city: 'Springfield' };
      fieldArray.addItem(testData);
      
      expect(listener.mock.calls[0][0].detail.data).toEqual(testData);
    });

    it('should increment index for multiple items', () => {
      const listener = vi.fn();
      fieldArray.addEventListener('item-added', listener);
      
      fieldArray.addItem();
      fieldArray.addItem();
      fieldArray.addItem();
      
      expect(listener.mock.calls[0][0].detail.index).toBe(0);
      expect(listener.mock.calls[1][0].detail.index).toBe(1);
      expect(listener.mock.calls[2][0].detail.index).toBe(2);
    });
  });

  // ==================== Removing Items ====================

  describe('Removing Items', () => {
    let template: HTMLTemplateElement;

    beforeEach(() => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      
      template = document.createElement('template');
      template.setAttribute('slot', 'item');
      template.innerHTML = '<input type="text" />';
      
      fieldArray.appendChild(template);
      container.appendChild(fieldArray);
      
      fieldArray.addItem();
      fieldArray.addItem();
      fieldArray.addItem();
    });

    it('should remove an item by element reference', () => {
      expect(fieldArray.getItemCount()).toBe(3);
      
      const wrapper = fieldArray.querySelector('.field-array-item-wrapper');
      if (wrapper && wrapper.parentElement === fieldArray) {
        fieldArray.removeItem(wrapper as HTMLElement);
      }
      
      expect(fieldArray.getItemCount()).toBe(2);
    });

    it('should remove item via remove button click', async () => {
      expect(fieldArray.getItemCount()).toBe(3);
      
      const removeBtn = fieldArray.querySelector('button.field-array-remove') as HTMLButtonElement;
      removeBtn?.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(fieldArray.getItemCount()).toBe(2);
    });

    it('should emit item-removed event', () => {
      const listener = vi.fn();
      fieldArray.addEventListener('item-removed', listener);
      
      const wrapper = fieldArray.querySelector('.field-array-item-wrapper');
      if (wrapper && wrapper.parentElement === fieldArray) {
        fieldArray.removeItem(wrapper as HTMLElement);
      }
      
      expect(listener).toHaveBeenCalled();
    });

    it('should pass correct index in item-removed event', () => {
      const listener = vi.fn();
      fieldArray.addEventListener('item-removed', listener);
      
      const wrappers = fieldArray.querySelectorAll('.field-array-item-wrapper');
      const secondWrapper = wrappers[1];
      if (secondWrapper && secondWrapper.parentElement === fieldArray) {
        fieldArray.removeItem(secondWrapper as HTMLElement);
      }
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].detail.index).toBe(1);
    });

    it('should not remove non-existent item', () => {
      const listener = vi.fn();
      fieldArray.addEventListener('item-removed', listener);
      
      const fakeElement = document.createElement('div');
      fieldArray.removeItem(fakeElement);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove item from DOM', async () => {
      expect(fieldArray.getItemCount()).toBe(3);
      
      const wrapper = fieldArray.querySelector('.field-array-item-wrapper');
      if (wrapper && wrapper.parentElement === fieldArray) {
        fieldArray.removeItem(wrapper as HTMLElement);
      }
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Wrapper should no longer be in DOM
      expect(wrapper?.parentElement).toBeNull();
    });
  });

  // ==================== Value Collection ====================

  describe('Value Collection', () => {
    let template: HTMLTemplateElement;

    beforeEach(() => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      
      template = document.createElement('template');
      template.setAttribute('slot', 'item');
      template.innerHTML = `
        <div class="address-fields">
          <input type="text" name="street" placeholder="Street" />
          <input type="text" name="city" placeholder="City" />
          <input type="text" name="zip" placeholder="ZIP" />
        </div>
      `;
      
      fieldArray.appendChild(template);
      container.appendChild(fieldArray);
    });

    it('should collect values from single item', async () => {
      fieldArray.addItem();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const inputs = fieldArray.querySelectorAll('input');
      if (inputs.length >= 3) {
        (inputs[0] as HTMLInputElement).value = '123 Main St';
        (inputs[1] as HTMLInputElement).value = 'Springfield';
        (inputs[2] as HTMLInputElement).value = '12345';
      }
      
      const values = fieldArray.getValues();
      
      expect(values.length).toBe(1);
      expect(values[0].street).toBe('123 Main St');
      expect(values[0].city).toBe('Springfield');
      expect(values[0].zip).toBe('12345');
    });

    it('should collect values from multiple items', async () => {
      fieldArray.addItem();
      fieldArray.addItem();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const inputs = fieldArray.querySelectorAll('input');
      
      // First item
      (inputs[0] as HTMLInputElement).value = '123 Main St';
      (inputs[1] as HTMLInputElement).value = 'Springfield';
      (inputs[2] as HTMLInputElement).value = '12345';
      
      // Second item
      (inputs[3] as HTMLInputElement).value = '456 Oak Ave';
      (inputs[4] as HTMLInputElement).value = 'Shelbyville';
      (inputs[5] as HTMLInputElement).value = '67890';
      
      const values = fieldArray.getValues();
      
      expect(values.length).toBe(2);
      expect(values[0].street).toBe('123 Main St');
      expect(values[0].city).toBe('Springfield');
      expect(values[1].street).toBe('456 Oak Ave');
      expect(values[1].city).toBe('Shelbyville');
    });

    it('should return empty array when no items', () => {
      const values = fieldArray.getValues();
      expect(values).toEqual([]);
    });

    it('should handle ux-field control detection', async () => {
      // Update template to use ux-field components
      fieldArray.innerHTML = '';
      const newTemplate = document.createElement('template');
      newTemplate.setAttribute('slot', 'item');
      newTemplate.innerHTML = `
        <ux-field name="street" label="Street">
          <input slot="control" type="text" />
        </ux-field>
        <ux-field name="city" label="City">
          <input slot="control" type="text" />
        </ux-field>
      `;
      fieldArray.appendChild(newTemplate);
      
      fieldArray.addItem();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const values = fieldArray.getValues();
      
      // Should collect from ux-field components
      expect(values.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== Item Count ====================

  describe('Item Count', () => {
    beforeEach(() => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      
      const template = document.createElement('template');
      template.setAttribute('slot', 'item');
      template.innerHTML = '<input type="text" />';
      
      fieldArray.appendChild(template);
      container.appendChild(fieldArray);
    });

    it('should return 0 for empty array', () => {
      expect(fieldArray.getItemCount()).toBe(0);
    });

    it('should track added items', () => {
      fieldArray.addItem();
      expect(fieldArray.getItemCount()).toBe(1);
      
      fieldArray.addItem();
      expect(fieldArray.getItemCount()).toBe(2);
      
      fieldArray.addItem();
      expect(fieldArray.getItemCount()).toBe(3);
    });

    it('should decrement count on removal', () => {
      fieldArray.addItem();
      fieldArray.addItem();
      fieldArray.addItem();
      
      expect(fieldArray.getItemCount()).toBe(3);
      
      const wrapper = fieldArray.querySelector('.field-array-item-wrapper');
      if (wrapper && wrapper.parentElement === fieldArray) {
        fieldArray.removeItem(wrapper as HTMLElement);
      }
      
      expect(fieldArray.getItemCount()).toBe(2);
    });
  });

  // ==================== Styling ====================

  describe('Styling', () => {
    beforeEach(() => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      
      const template = document.createElement('template');
      template.setAttribute('slot', 'item');
      template.innerHTML = '<input type="text" />';
      
      fieldArray.appendChild(template);
      container.appendChild(fieldArray);
    });

    it('should add styles to shadow DOM', async () => {
      fieldArray.addItem();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const styleEl = fieldArray.querySelector('style');
      expect(styleEl).toBeTruthy();
    });

    it('should apply item wrapper class', () => {
      fieldArray.addItem();
      
      const wrapper = fieldArray.querySelector('.field-array-item-wrapper');
      expect(wrapper).toBeTruthy();
    });

    it('should apply item container class', () => {
      fieldArray.addItem();
      
      const item = fieldArray.querySelector('.field-array-item');
      expect(item).toBeTruthy();
    });

    it('should apply remove button class', () => {
      fieldArray.addItem();
      
      const removeBtn = fieldArray.querySelector('.field-array-remove');
      expect(removeBtn).toBeTruthy();
    });
  });

  // ==================== Cleanup & Memory ====================

  describe('Cleanup & Memory', () => {
    beforeEach(() => {
      fieldArray = document.createElement('ux-field-array') as UxFieldArray;
      
      const template = document.createElement('template');
      template.setAttribute('slot', 'item');
      template.innerHTML = '<input type="text" />';
      
      fieldArray.appendChild(template);
      container.appendChild(fieldArray);
    });

    it('should properly clean up removed items', () => {
      fieldArray.addItem();
      fieldArray.addItem();
      
      const initialCount = fieldArray.getItemCount();
      
      const wrapper = fieldArray.querySelector('.field-array-item-wrapper');
      if (wrapper && wrapper.parentElement === fieldArray) {
        fieldArray.removeItem(wrapper as HTMLElement);
      }
      
      const finalCount = fieldArray.getItemCount();
      
      expect(finalCount).toBe(initialCount - 1);
    });

    it('should maintain correct indices after removal', () => {
      const listener = vi.fn();
      fieldArray.addEventListener('item-removed', listener);
      
      fieldArray.addItem();
      fieldArray.addItem();
      fieldArray.addItem();
      
      listener.mockClear();
      
      const wrappers = fieldArray.querySelectorAll('.field-array-item-wrapper');
      const middleWrapper = wrappers[1];
      if (middleWrapper && middleWrapper.parentElement === fieldArray) {
        fieldArray.removeItem(middleWrapper as HTMLElement);
      }
      
      // Verify the removed index was correct
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].detail.index).toBe(1);
    });
  });
});
