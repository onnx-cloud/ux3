/**
 * UxPanel Component Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UxPanel } from '../../../src/ui/widget/panel';

describe('UxPanel - Panel Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    if (!customElements.get('ux-panel')) {
      customElements.define('ux-panel', UxPanel);
    }
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null as unknown as HTMLDivElement;
  });

  it('registers the panel element', () => {
    expect(customElements.get('ux-panel')).toBe(UxPanel);
  });

  it('renders title text', async () => {
    const panel = document.createElement('ux-panel') as UxPanel;
    panel.setAttribute('title', 'My Panel');
    panel.setAttribute('collapsible', '');
    panel.setAttribute('expanded', 'false');
    container.appendChild(panel);
    await Promise.resolve();

    expect(panel.shadowRoot?.querySelector('.panel-title')?.textContent).toBe('My Panel');
  });

  it('toggles expanded state when clicked', async () => {
    const panel = document.createElement('ux-panel') as UxPanel;
    panel.setAttribute('title', 'Toggle Panel');
    panel.setAttribute('collapsible', '');
    panel.setAttribute('expanded', 'false');
    container.appendChild(panel);
    await Promise.resolve();

    const toggle = panel.shadowRoot?.querySelector('.panel-toggle') as HTMLButtonElement;
    toggle.click();

    expect(panel.expanded).toBe(true);
    expect(panel.shadowRoot?.querySelector('.panel-content')?.classList.contains('hidden')).toBe(false);
  });

  it('emits panel-expand and panel-collapse events', async () => {
    const panel = document.createElement('ux-panel') as UxPanel;
    panel.setAttribute('title', 'Events');
    panel.setAttribute('collapsible', '');
    panel.setAttribute('expanded', 'false');
    container.appendChild(panel);
    await Promise.resolve();

    const expandSpy = vi.fn();
    const collapseSpy = vi.fn();
    panel.addEventListener('panel-expand', expandSpy);
    panel.addEventListener('panel-collapse', collapseSpy);

    const toggle = panel.shadowRoot?.querySelector('.panel-toggle') as HTMLButtonElement;
    toggle.click();
    expect(expandSpy).toHaveBeenCalledTimes(1);

    toggle.click();
    expect(collapseSpy).toHaveBeenCalledTimes(1);
  });
});
