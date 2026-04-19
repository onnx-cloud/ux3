/**
 * UxDropdown Component Unit Tests
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { UxDropdown } from '../../../src/ui/widget/dropdown';

describe('UxDropdown - Dropdown Component', () => {
  let container: HTMLDivElement;

  beforeAll(() => {
    (HTMLElement.prototype as any).attachInternals = function () {
      return {
        setFormValue: vi.fn(),
      };
    };
  });

  beforeEach(() => {
    if (!customElements.get('ux-dropdown')) {
      customElements.define('ux-dropdown', UxDropdown);
    }
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null as unknown as HTMLDivElement;
  });

  it('registers the dropdown element', () => {
    expect(customElements.get('ux-dropdown')).toBe(UxDropdown);
  });

  it('opens and selects an option', async () => {
    const dropdown = document.createElement('ux-dropdown') as UxDropdown;
    dropdown.innerHTML = `
      <option value="us">United States</option>
      <option value="ca">Canada</option>
    `;
    container.appendChild(dropdown);
    await Promise.resolve();

    const toggle = dropdown.shadowRoot?.querySelector('.dropdown-toggle') as HTMLButtonElement;
    toggle.click();

    const option = dropdown.shadowRoot?.querySelector('.option[data-value="ca"]') as HTMLDivElement;
    expect(option).toBeTruthy();

    option.click();
    expect(dropdown.value).toBe('ca');
  });

  it('filters option list when filterable', async () => {
    const dropdown = document.createElement('ux-dropdown') as UxDropdown;
    dropdown.setAttribute('filterable', '');
    dropdown.innerHTML = `
      <option value="us">United States</option>
      <option value="ca">Canada</option>
    `;
    container.appendChild(dropdown);
    await Promise.resolve();

    const toggle = dropdown.shadowRoot?.querySelector('.dropdown-toggle') as HTMLButtonElement;
    toggle.click();

    const filter = dropdown.shadowRoot?.querySelector('.dropdown-filter') as HTMLInputElement;
    expect(filter).toBeTruthy();
    filter.value = 'Canada';
    filter.dispatchEvent(new Event('input', { bubbles: true }));

    expect(dropdown.shadowRoot?.querySelectorAll('.option').length).toBe(1);
    expect(dropdown.shadowRoot?.querySelector('.option')?.getAttribute('data-value')).toBe('ca');
  });

  it('emits change event when selection changes', async () => {
    const dropdown = document.createElement('ux-dropdown') as UxDropdown;
    dropdown.innerHTML = `<option value="us">United States</option>`;
    container.appendChild(dropdown);
    await Promise.resolve();

    const changeSpy = vi.fn();
    dropdown.addEventListener('change', changeSpy);

    const toggle = dropdown.shadowRoot?.querySelector('.dropdown-toggle') as HTMLButtonElement;
    toggle.click();

    const option = dropdown.shadowRoot?.querySelector('.option[data-value="us"]') as HTMLDivElement;
    option.click();

    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy.mock.calls[0][0].detail.value).toBe('us');
  });
});
