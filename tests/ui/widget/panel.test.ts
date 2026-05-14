/**
 * UxPanel Component Unit Tests (light DOM)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UxPanel } from '../../../src/ui/widget/primitives/panel';
// Ensure primitives are registered
import '../../../src/ui/widget/primitives/index.js';

describe('UxPanel - Panel Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null as unknown as HTMLDivElement;
  });

  it('registers the panel element', () => {
    expect(customElements.get('ux-panel')).toBeTruthy();
  });

  it('renders title text', async () => {
    const panel = document.createElement('ux-panel') as UxPanel;
    panel.setAttribute('title', 'My Panel');
    panel.setAttribute('collapsible', '');
    panel.setAttribute('expanded', 'false');
    container.appendChild(panel);
    await Promise.resolve();

    expect(panel.querySelector('.panel-title')?.textContent).toBe('My Panel');
  });

  it('toggles expanded state when clicked', async () => {
    const panel = document.createElement('ux-panel') as UxPanel;
    panel.setAttribute('title', 'Toggle Panel');
    panel.setAttribute('collapsible', '');
    panel.setAttribute('expanded', 'false');
    container.appendChild(panel);
    await Promise.resolve();

    const toggle = panel.querySelector('.panel-toggle') as HTMLButtonElement;
    toggle.click();

    expect(panel.expanded).toBe(true);
    const content = panel.querySelector('.panel-content') as HTMLDivElement;
    expect(content.style.display).toBe('');
  });

  it('emits ux:panel.toggle events', async () => {
    const panel = document.createElement('ux-panel') as UxPanel;
    panel.setAttribute('title', 'Events');
    panel.setAttribute('collapsible', '');
    panel.setAttribute('expanded', 'false');
    container.appendChild(panel);
    await Promise.resolve();

    const spy = vi.fn();
    panel.addEventListener('ux:panel.toggle', spy);

    const toggle = panel.querySelector('.panel-toggle') as HTMLButtonElement;
    toggle.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.expanded).toBe(true);

    toggle.click();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0].detail.expanded).toBe(false);
  });
});
