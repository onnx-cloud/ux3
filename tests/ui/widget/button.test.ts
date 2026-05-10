/**
 * UxButton Component Unit Tests (light DOM)
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

  it('contains a native <button> child in light DOM', () => {
    const button = document.createElement('ux-button') as UxButton;
    button.textContent = 'Save';
    container.appendChild(button);
    const innerButton = button.querySelector('button');
    expect(innerButton).toBeTruthy();
    expect(innerButton!.textContent).toBe('Save');
  });

  it('shows loading state and disables the button', async () => {
    const button = document.createElement('ux-button') as UxButton;
    button.textContent = 'Save';
    container.appendChild(button);

    button.setAttribute('loading', '');
    await Promise.resolve();

    expect(button.getAttribute('aria-busy')).toBe('true');
    const innerButton = button.querySelector('button') as HTMLButtonElement;
    expect(innerButton.disabled).toBe(true);
    expect(button.querySelector('.spinner')).toBeTruthy();
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
    expect(button.querySelector('.spinner')).toBeNull();
  });

  it('applies variant and size attributes', () => {
    const button = document.createElement('ux-button') as UxButton;
    button.setAttribute('variant', 'danger');
    button.setAttribute('size', 'lg');
    container.appendChild(button);

    expect(button.getAttribute('variant')).toBe('danger');
    expect(button.getAttribute('size')).toBe('lg');
  });

  it('dispatches submit event on closest light-DOM form when type=submit', async () => {
    const { UxButton: Btn } = await import('../../../src/ui/widget/button.js');

    const form = document.createElement('form');
    const button = document.createElement('ux-button') as any;
    button.setAttribute('type', 'submit');
    button.textContent = 'Submit';
    form.appendChild(button);
    document.body.appendChild(form);

    const submitSpy = { fired: false };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitSpy.fired = true;
    });

    const inner = button.querySelector('button');
    expect(inner).toBeTruthy();
    inner!.click();

    expect(submitSpy.fired).toBe(true);

    document.body.removeChild(form);
  });

  it('does not dispatch submit when type is not submit', async () => {
    const { UxButton: Btn } = await import('../../../src/ui/widget/button.js');

    const form = document.createElement('form');
    const button = document.createElement('ux-button') as any;
    button.setAttribute('type', 'button');
    button.textContent = 'Click';
    form.appendChild(button);
    document.body.appendChild(form);

    const submitSpy = { fired: false };
    form.addEventListener('submit', () => { submitSpy.fired = true; });

    const inner = button.querySelector('button');
    inner!.click();

    expect(submitSpy.fired).toBe(false);

    document.body.removeChild(form);
  });
});
