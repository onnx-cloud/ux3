/**
 * UxToast Component Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UxToastContainer } from '../../../src/ui/widget/toast';

describe('UxToastContainer - Toast Notifications', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    if (!customElements.get('ux-toast-container')) {
      customElements.define('ux-toast-container', UxToastContainer);
    }
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null as unknown as HTMLDivElement;
  });

  it('registers the toast container element', () => {
    expect(customElements.get('ux-toast-container')).toBe(UxToastContainer);
  });

  it('shows a toast and returns an id', () => {
    const toastContainer = document.createElement('ux-toast-container') as UxToastContainer;
    container.appendChild(toastContainer);

    const id = toastContainer.show({ message: 'Saved!', type: 'success', duration: 0 });
    expect(id).toContain('toast-');
    expect(toastContainer.shadowRoot?.querySelector('.toast.success')).toBeTruthy();
  });

  it('dismisses a toast by id', async () => {
    const toastContainer = document.createElement('ux-toast-container') as UxToastContainer;
    container.appendChild(toastContainer);

    const id = toastContainer.show({ message: 'Dismiss me', duration: 0 });
    expect(toastContainer.shadowRoot?.querySelector('.toast')).toBeTruthy();

    toastContainer.dismiss(id);
    await Promise.resolve();

    expect(toastContainer.shadowRoot?.querySelector('.toast')).toBeNull();
  });

  it('calls the action callback when the toast action button is clicked', async () => {
    const toastContainer = document.createElement('ux-toast-container') as UxToastContainer;
    container.appendChild(toastContainer);

    const callback = vi.fn();
    toastContainer.show({
      message: 'Action test',
      type: 'info',
      duration: 0,
      action: {
        label: 'Undo',
        callback,
      },
    });

    await Promise.resolve();
    const toastInstance = toastContainer.shadowRoot?.querySelector('ux-toast') as HTMLElement;
    expect(toastInstance).toBeTruthy();

    const actionButton = toastInstance.shadowRoot?.querySelector('.toast-action button') as HTMLButtonElement;
    expect(actionButton).toBeTruthy();

    actionButton.click();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('dismisses all toasts', async () => {
    const toastContainer = document.createElement('ux-toast-container') as UxToastContainer;
    container.appendChild(toastContainer);

    toastContainer.show({ message: 'One', duration: 0 });
    toastContainer.show({ message: 'Two', duration: 0 });

    await Promise.resolve();
    expect(toastContainer.shadowRoot?.querySelectorAll('.toast').length).toBe(2);

    toastContainer.dismissAll();
    await Promise.resolve();
    expect(toastContainer.shadowRoot?.querySelectorAll('.toast').length).toBe(0);
  });
});
