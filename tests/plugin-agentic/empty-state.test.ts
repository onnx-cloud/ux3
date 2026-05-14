import { afterEach, describe, expect, it } from 'vitest';
import { UxPlanTree } from '../../packages/@ux3/plugin-agentic/src/ux-agentic-plan.ts';
import { UxAgenticKanban } from '../../packages/@ux3/plugin-agentic/src/ux-agentic-kanban.ts';
import { UxAgenticFlow } from '../../packages/@ux3/plugin-agentic/src/ux-agentic-flow.ts';

function cleanup(): void {
  document.body.innerHTML = '';
}

afterEach(() => {
  cleanup();
});

describe('plugin-agentic empty-state rendering', () => {
  it('renders ux-empty-state when plan tree has no plan', () => {
    if (!customElements.get('ux-agentic-plan-tree')) {
      customElements.define('ux-agentic-plan-tree', UxPlanTree);
    }

    const el = document.createElement('ux-agentic-plan-tree') as UxPlanTree;
    document.body.appendChild(el);

    expect(el.innerHTML).toContain('<ux-empty-state');
    expect(el.innerHTML).toContain('No plan loaded');
    expect(el.innerHTML).toContain('Load a plan to view the current plan tree.');
  });

  it('renders ux-empty-state when kanban has no plan', () => {
    if (!customElements.get('ux-agentic-kanban')) {
      customElements.define('ux-agentic-kanban', UxAgenticKanban);
    }

    const el = document.createElement('ux-agentic-kanban') as UxAgenticKanban;
    document.body.appendChild(el);

    expect(el.innerHTML).toContain('<ux-empty-state');
    expect(el.innerHTML).toContain('No plan loaded');
    expect(el.innerHTML).toContain('Load a plan to see the kanban board.');
  });

  it('renders ux-empty-state when flow has no plan', () => {
    if (!customElements.get('ux-agentic-flow')) {
      customElements.define('ux-agentic-flow', UxAgenticFlow);
    }

    const el = document.createElement('ux-agentic-flow') as UxAgenticFlow;
    document.body.appendChild(el);

    expect(el.innerHTML).toContain('<ux-empty-state');
    expect(el.innerHTML).toContain('No plan loaded');
    expect(el.innerHTML).toContain('Load a plan to see the flow diagram.');
  });

  it('renders ux-empty-state when flow has an empty plan tree', () => {
    if (!customElements.get('ux-agentic-flow')) {
      customElements.define('ux-agentic-flow', UxAgenticFlow);
    }

    const el = document.createElement('ux-agentic-flow') as UxAgenticFlow;
    el.setPlan({ title: 'Empty plan', root: { children: [] } });
    document.body.appendChild(el);

    expect(el.innerHTML).toContain('<ux-empty-state');
    expect(el.innerHTML).toContain('No nodes to display');
    expect(el.innerHTML).toContain('Add nodes to your plan for the flow editor to render.');
  });
});
