/**
 * UX3 Field Array Component
 *
 * Manages repeated fields (e.g., multiple addresses)
 *
 * Usage:
 * <ux-field-array name="addresses" context="shipping">
 *   <template slot="item">
 *     <ux-field name="street">
 *       <input slot="control" />
 *     </ux-field>
 *   </template>
 * </ux-field-array>
 */

export class UxFieldArray extends HTMLElement {
  private items: HTMLElement[] = [];
  private template: HTMLTemplateElement | null = null;

  connectedCallback() {
    this.template = this.querySelector('template[slot="item"]');
    if (!this.template) {
      console.warn('ux-field-array requires a template with slot="item"');
    }
    this.render();
  }

  get name(): string {
    return this.getAttribute('name') || '';
  }

  get context(): string {
    return this.getAttribute('context') || 'common';
  }

  /**
   * Add a new field to the array
   */
  addItem(data?: Record<string, any>) {
    if (!this.template) return;

    const clone = this.template.content.cloneNode(true) as DocumentFragment;
    const container = document.createElement('div');
    container.className = 'field-array-item';
    container.appendChild(clone);

    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'field-array-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      this.removeItem(container);
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'field-array-item-wrapper';
    wrapper.appendChild(container);
    wrapper.appendChild(removeBtn);

    this.appendChild(wrapper);
    this.items.push(wrapper);

    // Dispatch event
    this.dispatchEvent(
      new CustomEvent('item-added', {
        detail: { index: this.items.length - 1, data },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Remove a field from the array
   */
  removeItem(element: HTMLElement) {
    const index = this.items.indexOf(element);
    if (index > -1) {
      element.remove();
      this.items.splice(index, 1);

      this.dispatchEvent(
        new CustomEvent('item-removed', {
          detail: { index },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Get all field values
   */
  getValues(): any[] {
    const values: any[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const fieldValues: Record<string, any> = {};

      // Collect values from ux-field components
      const fields = Array.from(item.querySelectorAll('ux-field'));
      for (const field of fields) {
        const fieldName = field.getAttribute('name');
        const control = field.querySelector('input, textarea, select') as HTMLInputElement;
        if (fieldName && control) {
          fieldValues[fieldName] = control.value;
        }
      }

      values.push(fieldValues);
    }

    return values;
  }

  /**
   * Get item count
   */
  getItemCount(): number {
    return this.items.length;
  }

  private render() {
    const style = document.createElement('style');
    style.textContent = `
      .field-array-item-wrapper {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        align-items: flex-start;
      }

      .field-array-item {
        flex: 1;
      }

      .field-array-remove {
        padding: 0.5rem 1rem;
        background-color: #ef4444;
        color: white;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        margin-top: 1.75rem;
        transition: background-color 200ms;
      }

      .field-array-remove:hover {
        background-color: #dc2626;
      }
    `;

    this.appendChild(style);
  }
}

if (!customElements.get('ux-field-array')) {
  customElements.define('ux-field-array', UxFieldArray);
}
