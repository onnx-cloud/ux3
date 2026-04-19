/**
 * UxButton Component Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UxButton } from '../../../src/ui/widget/button';

describe('UxButton - Button Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null as unknown as HTMLDivElement;
  });

  it('registers the button element', () => {
    expect(customElements.get('ux-button')).toBe(UxButton);
  });

  it('defaults to a button type', () => {
    const button = document.createElement('ux-button') as UxButton;
    container.appendChild(button);
    expect(button.getAttribute('type')).toBe('button');
  });

  it('shows loading state and disables the button', async () => {
    const button = document.createElement('ux-button') as UxButton;
    button.textContent = 'Save';
    container.appendChild(button);

    button.setAttribute('loading', '');
    await Promise.resolve();

    expect(button.getAttribute('aria-busy')).toBe('true');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    expect(innerButton.disabled).toBe(true);
    expect(button.shadowRoot?.querySelector('.spinner')).toBeTruthy();
  });

  it('removes loading state when attribute is cleared', async () => {
    const button = document.createElement('ux-button') as UxButton;
    button.textContent = 'Save';
    button.setAttribute('loading', '');
    container.appendChild(button);

    await Promise.resolve();
    button.removeAttribute('loading');
    await Promise.resolve();

    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.shadowRoot?.querySelector('.spinner')).toBeNull();
  });

  it('applies variant and size attributes', () => {
    const button = document.createElement('ux-button') as UxButton;
    button.setAttribute('variant', 'danger');
    button.setAttribute('size', 'lg');
    container.appendChild(button);

    expect(button.getAttribute('variant')).toBe('danger');
    expect(button.getAttribute('size')).toBe('lg');
  });
});
