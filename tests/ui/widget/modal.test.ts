import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { UxModal } from '../../../src/ui/widget/primitives/modal';

describe('UxModal - Modal Component', () => {
  let container: HTMLDivElement;

  beforeAll(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterAll(() => {
    container.remove();
  });

  function createModal(): UxModal {
    const el = new UxModal();
    container.appendChild(el);
    return el;
  }

  it('opens and closes with openModal/closeModal', async () => {
    const modal = createModal();
    await Promise.resolve();
    modal.openModal();
    expect(modal.getAttribute('opened')).toBe('true');
    modal.closeModal();
    expect(modal.hasAttribute('opened')).toBe(false);
  });

  it('emits CLOSE when closed', async () => {
    const modal = createModal();
    await Promise.resolve();
    const spy = vi.fn();
    modal.addEventListener('ux:widget.modal.event', ((e: CustomEvent) => {
      if (e.detail?.action === 'CLOSE') spy();
    }) as EventListener);
    modal.openModal();
    modal.closeModal();
    expect(spy).toHaveBeenCalled();
  });

  it('supports open() and close()', async () => {
    const modal = createModal();
    await Promise.resolve();
    expect(typeof modal.open).toBe('function');
    expect(typeof modal.close).toBe('function');
  });
});
