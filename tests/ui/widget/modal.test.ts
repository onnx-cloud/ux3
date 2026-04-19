/**
 * UxModal Component Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UxModal } from '../../../src/ui/widget/modal';

describe('UxModal - Modal Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    if (!customElements.get('ux-modal')) {
      customElements.define('ux-modal', UxModal);
    }
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null as unknown as HTMLDivElement;
  });

  it('registers the custom element', () => {
    expect(customElements.get('ux-modal')).toBe(UxModal);
  });

  it('opens and closes the dialog', async () => {
    const modal = document.createElement('ux-modal') as UxModal;
    modal.innerHTML = '<div slot="body">Hello modal</div>';
    container.appendChild(modal);
    await Promise.resolve();

    modal.openModal();
    expect(modal.getAttribute('opened')).toBe('true');
    expect(modal.shadowRoot?.querySelector('.modal-backdrop')?.classList.contains('visible')).toBe(true);
    expect(modal.shadowRoot?.querySelector('dialog')?.hasAttribute('open')).toBe(true);

    modal.closeModal();
    expect(modal.getAttribute('opened')).toBe('false');
    expect(modal.shadowRoot?.querySelector('.modal-backdrop')?.classList.contains('visible')).toBe(false);
  });

  it('emits modal-close when closed', async () => {
    const modal = document.createElement('ux-modal') as UxModal;
    container.appendChild(modal);
    await Promise.resolve();

    const closeSpy = vi.fn();
    modal.addEventListener('modal-close', closeSpy);

    modal.openModal();
    modal.closeModal();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('closes when pressing Escape', async () => {
    const modal = document.createElement('ux-modal') as UxModal;
    container.appendChild(modal);
    await Promise.resolve();

    modal.openModal();

    const dialog = modal.shadowRoot?.querySelector('dialog');
    expect(dialog).toBeTruthy();

    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal.getAttribute('opened')).toBe('false');
  });

  it('closes when clicking the backdrop', async () => {
    const modal = document.createElement('ux-modal') as UxModal;
    container.appendChild(modal);
    await Promise.resolve();

    modal.openModal();
    const backdrop = modal.shadowRoot?.querySelector('.modal-backdrop') as HTMLDivElement;
    backdrop?.click();

    expect(modal.getAttribute('opened')).toBe('false');
  });
});
