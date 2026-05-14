import { UxBase } from '../../../../src/ui/widget/primitives/base.js';

const STYLES = `
  :host {
    display: block; font-family: system-ui; overflow: auto;
    --flow-pending-border: #d1d5db; --flow-pending-text: #475569;
    --flow-progress-border: #3b82f6; --flow-progress-bg: #eff6ff; --flow-progress-text: #1e40af;
    --flow-done-border: #22c55e; --flow-done-bg: #f0fdf4; --flow-done-text: #166534;
    --flow-failed-border: #ef4444; --flow-failed-bg: #fef2f2; --flow-failed-text: #991b1b;
    --flow-cancelled-border: #9ca3af; --flow-cancelled-text: #6b7280;
  }
  .flow-container { position: relative; min-height: 200px; padding: 1.5rem; }
  .flow-canvas { position: relative; min-height: 160px; }
  .flow-node {
    position: absolute; min-width: 160px; max-width: 220px;
    background: var(--color-bg, #fff); border: 2px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem; padding: 0.625rem 0.75rem;
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .flow-node:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-color: var(--color-primary, #3b82f6);
  }
  .flow-node[data-status="pending"] { border-color: var(--flow-pending-border, #d1d5db); }
  .flow-node[data-status="in_progress"] { border-color: var(--flow-progress-border, #3b82f6); background: var(--flow-progress-bg, #eff6ff); }
  .flow-node[data-status="completed"] { border-color: var(--flow-done-border, #22c55e); background: var(--flow-done-bg, #f0fdf4); }
  .flow-node[data-status="failed"] { border-color: var(--flow-failed-border, #ef4444); background: var(--flow-failed-bg, #fef2f2); }
  .flow-node[data-status="cancelled"] { border-color: var(--flow-cancelled-border, #9ca3af); opacity: 0.6; }
  .flow-node-title { font-size: 0.75rem; font-weight: 700; color: var(--color-text, #0f172a); }
  .flow-node-desc { font-size: 0.625rem; color: var(--color-text-muted, #6b7280); margin-top: 0.125rem; line-height: 1.3; }
  .flow-node-status {
    display: inline-block; font-size: 0.5625rem; padding: 0.0625rem 0.3125rem;
    border-radius: 0.1875rem; font-weight: 600; margin-top: 0.25rem;
  }
  .flow-node-status[data-status="pending"] { background: var(--flow-pending-border, #f1f5f9); color: var(--flow-pending-text, #475569); }
  .flow-node-status[data-status="in_progress"] { background: var(--flow-progress-bg, #dbeafe); color: var(--flow-progress-text, #1e40af); }
  .flow-node-status[data-status="completed"] { background: var(--flow-done-bg, #dcfce7); color: var(--flow-done-text, #166534); }
  .flow-node-status[data-status="failed"] { background: var(--flow-failed-bg, #fee2e2); color: var(--flow-failed-text, #991b1b); }
  .flow-svg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .flow-svg line { stroke: var(--color-border, #cbd5e1); stroke-width: 2; }
  .flow-svg line[data-status="in_progress"] { stroke: var(--flow-progress-border, #3b82f6); stroke-width: 2.5; stroke-dasharray: 6,3; animation: flow-dash 1s linear infinite; }
  .flow-svg line[data-status="completed"] { stroke: var(--flow-done-border, #22c55e); }
  .flow-svg line[data-status="failed"] { stroke: var(--flow-failed-border, #ef4444); }
  @keyframes flow-dash { to { stroke-dashoffset: -18; } }
`;

export class UxAgenticFlow extends UxBase {
  private plan: any = null;
  private engine: any = null;
  private observerCleanup: (() => void) | null = null;
  private engineConnectRequest: number | null = null;
  private nodePositions: Map<string, { x: number; y: number }> = new Map();

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
    const existingContainer = this.querySelector('.flow-container');
    if (existingContainer) existingContainer.remove();

    const container = document.createElement('div');
    container.className = 'flow-container';

    if (!this.plan) {
      container.innerHTML = '<ux-empty-state><div class="title">No plan loaded</div><div class="desc">Load a plan to see the flow diagram.</div></ux-empty-state>';
      this.appendChild(container);
      return;
    }

    const allNodes = this.flattenNodes(this.plan.root?.children || []);
    if (allNodes.length === 0) {
      container.innerHTML = '<ux-empty-state><div class="title">No nodes to display</div><div class="desc">Add nodes to your plan for the flow editor to render.</div></ux-empty-state>';
      this.appendChild(container);
      return;
    }

    this.layoutNodes(allNodes);

    const canvas = document.createElement('div');
    canvas.className = 'flow-canvas';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('flow-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const { edges } = this.collectEdges(allNodes);
    for (const edge of edges) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(edge.x1));
      line.setAttribute('y1', String(edge.y1));
      line.setAttribute('x2', String(edge.x2));
      line.setAttribute('y2', String(edge.y2));
      line.dataset.status = edge.status;
      svg.appendChild(line);
    }
    canvas.appendChild(svg);

    for (const node of allNodes) {
      const pos = this.nodePositions.get(node.id);
      if (!pos) continue;
      const el = document.createElement('div');
      el.className = 'flow-node';
      el.dataset.nodeId = node.id;
      el.dataset.status = node.status || 'pending';
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.style.zIndex = '1';
      const title = document.createElement('div');
      title.className = 'flow-node-title';
      title.textContent = node.title || 'Untitled';
      el.appendChild(title);
      if (node.description) {
        const desc = document.createElement('div');
        desc.className = 'flow-node-desc';
        desc.textContent = node.description.length > 80 ? node.description.slice(0, 77) + '...' : node.description;
        el.appendChild(desc);
      }
      const status = document.createElement('span');
      status.className = 'flow-node-status';
      status.dataset.status = node.status || 'pending';
      status.textContent = node.status || 'pending';
      el.appendChild(status);
      el.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('ux:agentic.update', {
          detail: { planId: this.plan?.id, nodeId: node.id, action: 'select' },
          bubbles: true, composed: true,
        }));
      });
      canvas.appendChild(el);
    }

    container.appendChild(canvas);
    this.appendChild(container);
  }

  private layoutNodes(nodes: any[]): void {
    this.nodePositions.clear();
    const levels = this.computeLevels(nodes);
    const NODE_W = 180;
    const V_GAP = 120;
    const H_GAP = 280;
    const PAD_X = 40;
    const PAD_Y = 20;

    for (const [levelIdx, levelNodes] of levels.entries()) {
      const x = PAD_X + levelIdx * H_GAP;
      const totalH = levelNodes.length * V_GAP;
      const startY = PAD_Y + Math.max(0, (Math.max(1, levels.length) * V_GAP - totalH) / 2);
      for (const [nodeIdx, node] of levelNodes.entries()) {
        this.nodePositions.set(node.id, { x, y: startY + nodeIdx * V_GAP });
      }
    }

    const maxY = Math.max(1, nodes.length) * V_GAP + PAD_Y * 2;
    const maxX = levels.length * H_GAP + PAD_X * 2;
    const canvas = this.querySelector('.flow-canvas') as HTMLElement;
    if (canvas) {
      canvas.style.height = `${maxY}px`;
      canvas.style.width = `${maxX}px`;
    }
  }

  private computeLevels(nodes: any[]): any[][] {
    const levels: any[][] = [];
    const visited = new Set<string>();
    function walk(node: any, level: number): void {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      while (levels.length <= level) levels.push([]);
      levels[level].push(node);
      if (node.children?.length) for (const child of node.children) walk(child, level + 1);
    }
    for (const top of nodes) walk(top, 0);
    return levels;
  }

  private collectEdges(nodes: any[]): { edges: Array<{ x1: number; y1: number; x2: number; y2: number; status: string }> } {
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number; status: string }> = [];
    const NODE_W = 180;
    for (const node of nodes) {
      const fromPos = this.nodePositions.get(node.id);
      if (!fromPos) continue;
      const targets: any[] = node.children || [];
      for (const target of targets) {
        const toPos = this.nodePositions.get(target.id);
        if (!toPos) continue;
        edges.push({ x1: fromPos.x + NODE_W, y1: fromPos.y + 45, x2: toPos.x, y2: toPos.y + 45, status: target.status || 'pending' });
      }
    }
    return { edges };
  }

  private flattenNodes(nodes: any[]): any[] {
    const result: any[] = [];
    for (const n of nodes) { result.push(n); if (n.children?.length) result.push(...this.flattenNodes(n.children)); }
    return result;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-agentic-flow')) {
  customElements.define('ux-agentic-flow', UxAgenticFlow);
}
