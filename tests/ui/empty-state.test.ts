import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UxEmptyState } from '../../src/ui/widget/primitives/empty-state.ts';

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  const el = document.querySelector('ux-empty-state');
  if (el) el.remove();
});

describe('UxEmptyState', () => {
  it('renders default title when empty', () => {
    if (!customElements.get('ux-empty-state')) {
      customElements.define('ux-empty-state', UxEmptyState);
    }

    const empty = document.createElement('ux-empty-state');
    document.body.appendChild(empty);

    const title = empty.querySelector('.title');
    expect(title).toBeTruthy();
    expect(title?.textContent).toBe('No data');
    expect(empty.textContent).toContain('💭');
  });

  it('preserves nested markup and prepends the icon', () => {
    if (!customElements.get('ux-empty-state')) {
      customElements.define('ux-empty-state', UxEmptyState);
    }

    const empty = document.createElement('ux-empty-state');
    empty.innerHTML = '<div class="title">No entries yet</div><div class="desc">Create an item to continue.</div>';
    document.body.appendChild(empty);

    const title = empty.querySelector('.title');
    const desc = empty.querySelector('.desc');
    const icon = empty.querySelector('span');

    expect(title).toBeTruthy();
    expect(title?.textContent).toBe('No entries yet');
    expect(desc).toBeTruthy();
    expect(desc?.textContent).toBe('Create an item to continue.');
    expect(icon).toBeTruthy();
    expect(icon?.textContent).toBe('💭');
  });
});
