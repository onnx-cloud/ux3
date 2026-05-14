import { UxBase } from '../../../../src/ui/widget/primitives/base.js';

const STYLES = `
  :host {
    display: block; font-family: system-ui; overflow-x: auto;
    --kanban-pending-bg: #f1f5f9; --kanban-pending-text: #475569;
    --kanban-progress-bg: #dbeafe; --kanban-progress-text: #1e40af;
    --kanban-done-bg: #dcfce7; --kanban-done-text: #166534;
    --kanban-failed-bg: #fee2e2; --kanban-failed-text: #991b1b;
    --kanban-cancelled-bg: #f3f4f6; --kanban-cancelled-text: #6b7280;
  }
  .kanban-board { display: flex; gap: 0.75rem; min-height: 200px; padding: 0.25rem; }
  .kanban-column {
    flex: 1; min-width: 220px; max-width: 320px;
    background: var(--kanban-col-bg, #f8fafc);
    border-radius: 0.5rem; border: 1px solid var(--color-border, #e2e8f0);
    display: flex; flex-direction: column;
  }
  .kanban-col-header {
    padding: 0.5rem 0.75rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; border-bottom: 1px solid var(--color-border, #e2e8f0);
    display: flex; align-items: center; gap: 0.375rem;
  }
  .kanban-col-count {
    font-size: 0.625rem; padding: 0.0625rem 0.375rem; border-radius: 0.625rem;
    background: var(--color-border-light, #e2e8f0); color: var(--color-text-muted, #475569);
  }
  .kanban-col-body { flex: 1; padding: 0.375rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.375rem; }
  .kanban-card {
    background: var(--color-bg, #fff); border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.375rem; padding: 0.5rem; cursor: pointer;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .kanban-card:hover {
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .kanban-card-title { font-size: 0.75rem; font-weight: 600; color: var(--color-text, #0f172a); }
  .kanban-card-desc { font-size: 0.625rem; color: var(--color-text-muted, #6b7280); margin-top: 0.125rem; line-height: 1.3; }
  .kanban-card-meta { margin-top: 0.25rem; display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; }
  .kanban-card-status {
    font-size: 0.5625rem; padding: 0.0625rem 0.3125rem; border-radius: 0.1875rem; font-weight: 600;
  }
  .kanban-card-status[data-status="pending"] { background: var(--kanban-pending-bg, #f1f5f9); color: var(--kanban-pending-text, #475569); }
  .kanban-card-status[data-status="in_progress"] { background: var(--kanban-progress-bg, #dbeafe); color: var(--kanban-progress-text, #1e40af); }
  .kanban-card-status[data-status="completed"] { background: var(--kanban-done-bg, #dcfce7); color: var(--kanban-done-text, #166534); }
  .kanban-card-status[data-status="failed"] { background: var(--kanban-failed-bg, #fee2e2); color: var(--kanban-failed-text, #991b1b); }
  .kanban-card-status[data-status="cancelled"] { background: var(--kanban-cancelled-bg, #f3f4f6); color: var(--kanban-cancelled-text, #6b7280); }
  .kanban-card-iter { font-size: 0.5625rem; color: var(--color-text-muted, #9ca3af); }
  .kanban-card-actions { display: flex; gap: 0.25rem; margin-top: 0.25rem; }
  .kanban-card-action {
    font-size: 0.5625rem; padding: 0.0625rem 0.375rem;
    border: 1px solid var(--color-border, #d1d5db); border-radius: 0.1875rem;
    background: transparent; cursor: pointer; color: var(--color-text-muted, #6b7280);
  }
  .kanban-card-action:hover { background: var(--color-border-light, #f1f5f9); }
  .kanban-col-header[data-column="in_progress"] { color: var(--kanban-progress-text, #1e40af); }
  .kanban-col-header[data-column="completed"] { color: var(--kanban-done-text, #166534); }
  .kanban-col-header[data-column="failed"] { color: var(--kanban-failed-text, #991b1b); }
`;

const COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

export class UxAgenticKanban extends UxBase {
  private plan: any = null;
  private engine: any = null;
  private observerCleanup: (() => void) | null = null;
  private engineConnectRequest: number | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = STYLES;
    this.appendChild(style);
    this.render();
    this.connectToEngine();
  }

  protected onDisconnected(): void {
    if (this.engineConnectRequest !== null) {
      cancelAnimationFrame(this.engineConnectRequest);
      this.engineConnectRequest = null;
    }
    if (this.observerCleanup) {
      this.observerCleanup();
      this.observerCleanup = null;
    }
    super.onDisconnected();
  }

  protected applyData(data: any): void {
    if (data && typeof data === 'object' && data.title && data.root) {
      this.plan = data;
      this.render();
    }
  }

  setPlan(plan: any): void {
    this.plan = plan;
    this.render();
  }

  private connectToEngine(): void {
    if (this.engineConnectRequest !== null) {
      cancelAnimationFrame(this.engineConnectRequest);
      this.engineConnectRequest = null;
    }

    const engine = (window as any).__ux3PlanEngine;
    if (engine && typeof engine.observe === 'function') {
      this.setEngine(engine);
      return;
    }

    this.engineConnectRequest = requestAnimationFrame(() => this.connectToEngine());
  }

  setEngine(engine: any): void {
    this.engine = engine;
    if (this.observerCleanup) this.observerCleanup();
    if (!engine || typeof engine.observe !== 'function') return;
    this.observerCleanup = engine.observe((plan: any) => {
      this.plan = plan;
      this.render();
    });
    if (engine.activePlan) {
      this.plan = engine.activePlan;
      this.render();
    }
  }

  private render(): void {
    const existingBoard = this.querySelector('.kanban-board');
    if (existingBoard) existingBoard.remove();

    if (!this.plan) {
      const empty = document.createElement('div');
      empty.innerHTML = '<ux-empty-state><div class="title">No plan loaded</div><div class="desc">Load a plan to see the kanban board.</div></ux-empty-state>';
      this.appendChild(empty);
      return;
    }

    const allNodes = this.flattenNodes(this.plan.root?.children || []);
    const nodesByStatus = new Map<string, any[]>();
    for (const col of COLUMNS) nodesByStatus.set(col.key, []);
    for (const node of allNodes) {
      const status = node.status || 'pending';
      const existing = nodesByStatus.get(status);
      if (existing) existing.push(node);
      else (nodesByStatus.get('pending') || []).push(node);
    }

    const board = document.createElement('div');
    board.className = 'kanban-board';
    for (const col of COLUMNS) {
      board.appendChild(this.buildColumn(col.label, col.key, nodesByStatus.get(col.key) || []));
    }
    this.appendChild(board);
  }

  private buildColumn(label: string, key: string, nodes: any[]): HTMLElement {
    const col = document.createElement('div');
    col.className = 'kanban-column';
    const header = document.createElement('div');
    header.className = 'kanban-col-header';
    header.dataset.column = key;
    header.textContent = label;
    const count = document.createElement('span');
    count.className = 'kanban-col-count';
    count.textContent = String(nodes.length);
    header.appendChild(count);
    col.appendChild(header);
    const body = document.createElement('div');
    body.className = 'kanban-col-body';
    for (const node of nodes) body.appendChild(this.buildCard(node));
    col.appendChild(body);
    return col;
  }

  private buildCard(node: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.dataset.nodeId = node.id;
    const title = document.createElement('div');
    title.className = 'kanban-card-title';
    title.textContent = node.title || 'Untitled';
    card.appendChild(title);
    if (node.description) {
      const desc = document.createElement('div');
      desc.className = 'kanban-card-desc';
      desc.textContent = node.description.length > 120 ? node.description.slice(0, 117) + '...' : node.description;
      card.appendChild(desc);
    }
    const meta = document.createElement('div');
    meta.className = 'kanban-card-meta';
    const status = document.createElement('span');
    status.className = 'kanban-card-status';
    status.dataset.status = node.status || 'pending';
    status.textContent = node.status || 'pending';
    meta.appendChild(status);
    if (node.ctx?.iteration && node.ctx.iteration > 0) {
      const iter = document.createElement('span');
      iter.className = 'kanban-card-iter';
      iter.textContent = `#${node.ctx.iteration}`;
      meta.appendChild(iter);
    }
    const obsCount = (node.observations || []).length;
    if (obsCount > 0) {
      const obs = document.createElement('span');
      obs.className = 'kanban-card-iter';
      obs.textContent = `${obsCount} obs`;
      meta.appendChild(obs);
    }
    card.appendChild(meta);
    if (node.status === 'failed' || node.status === 'pending') {
      const actions = document.createElement('div');
      actions.className = 'kanban-card-actions';
      const retryBtn = document.createElement('button');
      retryBtn.className = 'kanban-card-action';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', (e) => { e.stopPropagation(); this.emit('retry', node); });
      actions.appendChild(retryBtn);
      const skipBtn = document.createElement('button');
      skipBtn.className = 'kanban-card-action';
      skipBtn.textContent = 'Skip';
      skipBtn.addEventListener('click', (e) => { e.stopPropagation(); this.emit('skip', node); });
      actions.appendChild(skipBtn);
      card.appendChild(actions);
    }
    card.addEventListener('click', () => this.emit('select', node));
    return card;
  }

  private emit(action: string, node: any): void {
    this.dispatchEvent(new CustomEvent('ux:agentic.update', {
      detail: { planId: this.plan?.id, nodeId: node.id, action },
      bubbles: true, composed: true,
    }));
  }

  private flattenNodes(nodes: any[]): any[] {
    const result: any[] = [];
    for (const n of nodes) { result.push(n); if (n.children?.length) result.push(...this.flattenNodes(n.children)); }
    return result;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-agentic-kanban')) {
  customElements.define('ux-agentic-kanban', UxAgenticKanban);
}
