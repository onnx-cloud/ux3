import { UxBase } from '../../../../src/ui/widget/primitives/base.js';

export class UxPlanTree extends UxBase {
  private plan: any = null;
  private engine: any = null;
  private observerCleanup: (() => void) | null = null;
  private engineConnectRequest: number | null = null;
  private nodeElements: Map<string, HTMLElement> = new Map();

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'tree');
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

  static get observedAttributes(): string[] { return ['plan']; }

  protected onAttributeChanged(name: string, _old: string | null, val: string | null): void {
    if (name === 'plan' && val) {
      try { this.plan = JSON.parse(val); this.render(); } catch {}
    }
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

    this.observerCleanup = engine.observe((plan: any, node: any) => {
      if (!this.plan || this.plan.id !== plan.id) {
        this.plan = plan;
        this.render();
        return;
      }
      this.updateNodeElement(node);
      this.updatePlanHeader(plan);
    });

    if (engine.activePlan) {
      this.plan = engine.activePlan;
      this.render();
    }
  }

  private updatePlanHeader(plan: any): void {
    const statusEl = this.querySelector('.ux-plan-status');
    if (statusEl) {
      (statusEl as HTMLElement).dataset.status = plan.status || 'created';
      statusEl.textContent = plan.status || 'created';
    }
  }

  private updateNodeElement(node: any): void {
    const el = this.nodeElements.get(node.id);
    if (!el) return;

    const indicator = el.querySelector('.ux-plan-node-indicator') as HTMLElement;
    if (indicator) {
      indicator.dataset.status = node.status || 'pending';
    }

    const iterEl = el.querySelector('.ux-plan-node-iter') as HTMLElement;
    if (iterEl) {
      if (node.ctx?.iteration && node.ctx.iteration > 0) {
        iterEl.textContent = `(#${node.ctx.iteration})`;
        iterEl.style.display = '';
      } else {
        iterEl.style.display = 'none';
      }
    }

    const phaseEl = el.querySelector('.ux-plan-node-phase') as HTMLElement;
    if (phaseEl) {
      if (node.ctx?.statePath?.length) {
        phaseEl.textContent = node.ctx.statePath[node.ctx.statePath.length - 1] || node.ctx.statePath[0];
        phaseEl.style.display = '';
      } else {
        phaseEl.style.display = 'none';
      }
    }

    const traceHeader = el.querySelector('.ux-plan-trace-header') as HTMLElement;
    if (traceHeader && node.ctx?.statePath?.length) {
      traceHeader.textContent = '+ trace (' + node.ctx.statePath.join(' → ') + ')';
    }
  }

  private render(): void {
    if (!this.plan) {
      this.innerHTML = '<ux-empty-state><div class="title">No plan loaded</div><div class="desc">Load a plan to view the current plan tree.</div></ux-empty-state>';
      return;
    }

    this.nodeElements.clear();

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block; font-family: system-ui;
        --tree-pending-bg: #e2e8f0; --tree-pending-text: #475569;
        --tree-progress-bg: #dbeafe; --tree-progress-text: #1e40af;
        --tree-done-bg: #dcfce7; --tree-done-text: #166534;
        --tree-failed-bg: #fee2e2; --tree-failed-text: #991b1b;
        --tree-cancelled-bg: #f3f4f6; --tree-cancelled-text: #6b7280;
        --tree-pulse: #3b82f6; --tree-success-line: #22c55e;
        --tree-obs-info: #22c55e; --tree-obs-warn: #f59e0b; --tree-obs-error: #ef4444;
        --tree-obs-tool-call: #3b82f6; --tree-obs-tool-result: #22c55e;
        --tree-trace-observe: #22c55e; --tree-trace-think: #8b5cf6; --tree-trace-orient: #f59e0b;
        --tree-trace-act: #3b82f6; --tree-trace-synthesize: #06b6d4; --tree-trace-critique: #ec4899;
      }
      .ux-plan-header { padding: 0.5rem; border-bottom: 1px solid var(--color-border, #e2e8f0); }
      .ux-plan-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text, #0f172a); }
      .ux-plan-goal { font-size: 0.75rem; color: var(--color-text-muted, #6b7280); margin-top: 0.125rem; }
      .ux-plan-status { display: inline-block; padding: 0.0625rem 0.375rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 600; margin-left: 0.5rem; }
      .ux-plan-status[data-status="created"] { background: var(--tree-pending-bg, #e2e8f0); color: var(--tree-pending-text, #475569); }
      .ux-plan-status[data-status="running"] { background: var(--tree-progress-bg, #dbeafe); color: var(--tree-progress-text, #1e40af); }
      .ux-plan-status[data-status="completed"] { background: var(--tree-done-bg, #dcfce7); color: var(--tree-done-text, #166534); }
      .ux-plan-status[data-status="failed"] { background: var(--tree-failed-bg, #fee2e2); color: var(--tree-failed-text, #991b1b); }
      .ux-plan-status[data-status="cancelled"] { background: var(--tree-cancelled-bg, #f3f4f6); color: var(--tree-cancelled-text, #6b7280); }
      .ux-plan-nodes { padding: 0.25rem 0; }
      .ux-plan-node { display: flex; align-items: flex-start; gap: 0.25rem; padding: 0.25rem 0.5rem; border-bottom: 1px solid var(--color-border-light, #f1f5f9); cursor: default; }
      .ux-plan-node-indicator { width: 0.625rem; height: 0.625rem; border-radius: 50%; flex-shrink: 0; margin-top: 0.1875rem; }
      .ux-plan-node-indicator[data-status="pending"] { background: var(--color-border, #d1d5db); }
      .ux-plan-node-indicator[data-status="in_progress"] { background: var(--tree-pulse, #3b82f6); animation: pulse-status 1s ease-in-out infinite; }
      .ux-plan-node-indicator[data-status="completed"] { background: var(--tree-success-line, #22c55e); }
      .ux-plan-node-indicator[data-status="failed"] { background: var(--tree-failed-text, #ef4444); }
      .ux-plan-node-indicator[data-status="cancelled"] { background: #9ca3af; }
      @keyframes pulse-status { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
      .ux-plan-node-content { flex: 1; min-width: 0; }
      .ux-plan-node-header { display: flex; align-items: center; gap: 0.375rem; }
      .ux-plan-node-title { font-size: 0.75rem; color: var(--color-text, #0f172a); }
      .ux-plan-node-iter { font-size: 0.5625rem; color: var(--color-text-muted, #9ca3af); }
      .ux-plan-node-desc { font-size: 0.625rem; color: var(--color-text-muted, #6b7280); }
      .ux-plan-node-phase { font-size: 0.5625rem; padding: 0.0625rem 0.25rem; border-radius: 0.1875rem; background: var(--color-border-light, #f1f5f9); color: var(--tree-pending-text, #475569); margin-left: 0.25rem; }
      .ux-plan-node-actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
      .ux-plan-node-action { font-size: 0.5625rem; padding: 0.0625rem 0.375rem; border: 1px solid var(--color-border, #d1d5db); border-radius: 0.25rem; background: transparent; cursor: pointer; color: var(--color-text-muted, #6b7280); }
      .ux-plan-node-action:hover { background: var(--color-border-light, #f1f5f9); }
      .ux-plan-node-children { margin-left: 1rem; }
      .ux-plan-trace { margin-top: 0.125rem; border-left: 2px solid var(--color-border, #e2e8f0); padding-left: 0.5rem; }
      .ux-plan-trace-header { font-size: 0.5625rem; color: var(--color-text-muted, #9ca3af); cursor: pointer; display: flex; align-items: center; gap: 0.125rem; }
      .ux-plan-trace-header:hover { color: var(--color-text, #0f172a); }
      .ux-plan-trace-body { display: none; margin-top: 0.125rem; }
      .ux-plan-trace-body.open { display: block; }
      .ux-plan-trace-phase { font-size: 0.5625rem; padding: 0.03125rem 0.25rem; margin-top: 0.0625rem; }
      .ux-plan-trace-phase[data-phase-type="observe"], .ux-plan-trace-phase[data-phase-type="gather"] { border-left: 2px solid var(--tree-trace-observe, #22c55e); color: var(--tree-done-text, #166534); }
      .ux-plan-trace-phase[data-phase-type="think"], .ux-plan-trace-phase[data-phase-type="reason"] { border-left: 2px solid var(--tree-trace-think, #8b5cf6); color: #5b21b6; }
      .ux-plan-trace-phase[data-phase-type="orient"], .ux-plan-trace-phase[data-phase-type="decide"], .ux-plan-trace-phase[data-phase-type="plan"] { border-left: 2px solid var(--tree-trace-orient, #f59e0b); color: #92400e; }
      .ux-plan-trace-phase[data-phase-type="act"], .ux-plan-trace-phase[data-phase-type="executeTool"] { border-left: 2px solid var(--tree-trace-act, #3b82f6); color: var(--tree-progress-text, #1e40af); }
      .ux-plan-trace-phase[data-phase-type="synthesize"], .ux-plan-trace-phase[data-phase-type="finalize"], .ux-plan-trace-phase[data-phase-type="respond"] { border-left: 2px solid var(--tree-trace-synthesize, #06b6d4); color: #155e75; }
      .ux-plan-trace-phase[data-phase-type="critique"], .ux-plan-trace-phase[data-phase-type="revise"] { border-left: 2px solid var(--tree-trace-critique, #ec4899); color: #9d174d; }
      .ux-plan-trace-phase[data-phase-type="error"] { border-left: 2px solid var(--tree-obs-error, #ef4444); color: var(--tree-failed-text, #991b1b); }
      .ux-plan-observations { margin-top: 0.125rem; }
      .ux-plan-obs { font-size: 0.5625rem; padding: 0.0625rem 0.25rem; border-left: 2px solid var(--color-border, #d1d5db); margin-top: 0.0625rem; }
      .ux-plan-obs[data-type="error"] { border-color: var(--tree-obs-error, #ef4444); color: var(--tree-failed-text, #991b1b); background: var(--tree-failed-bg, #fef2f2); }
      .ux-plan-obs[data-type="warning"] { border-color: var(--tree-obs-warn, #f59e0b); color: #92400e; background: #fffbeb; }
      .ux-plan-obs[data-type="tool_call"] { border-color: var(--tree-obs-tool-call, #3b82f6); color: var(--tree-progress-text, #1e40af); background: var(--tree-progress-bg, #eff6ff); }
      .ux-plan-obs[data-type="tool_result"] { border-color: var(--tree-obs-tool-result, #22c55e); color: var(--tree-done-text, #166534); background: var(--tree-done-bg, #f0fdf4); }
    `;

    this.innerHTML = '';
    this.appendChild(style);

    const header = document.createElement('div');
    header.className = 'ux-plan-header';

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:0.25rem;';
    const title = document.createElement('span');
    title.className = 'ux-plan-title';
    title.textContent = this.plan.title || 'Plan';
    titleWrap.appendChild(title);
    const status = document.createElement('span');
    status.className = 'ux-plan-status';
    status.dataset.status = this.plan.status || 'created';
    status.textContent = this.plan.status || 'created';
    titleWrap.appendChild(status);
    header.appendChild(titleWrap);

    if (this.plan.goal) {
      const goal = document.createElement('div');
      goal.className = 'ux-plan-goal';
      goal.textContent = this.plan.goal;
      header.appendChild(goal);
    }
    this.appendChild(header);

    const nodes = document.createElement('div');
    nodes.className = 'ux-plan-nodes';
    if (this.plan.root?.children) {
      for (const node of this.plan.root.children) {
        nodes.appendChild(this.buildNodeElement(node, 0));
      }
    }
    this.appendChild(nodes);
  }

  private buildNodeElement(node: any, depth: number): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ux-plan-node';
    el.style.paddingLeft = `${0.5 + depth * 1}rem`;
    el.dataset.nodeId = node.id;
    this.nodeElements.set(node.id, el);

    const indicator = document.createElement('div');
    indicator.className = 'ux-plan-node-indicator';
    indicator.dataset.status = node.status || 'pending';
    el.appendChild(indicator);

    const content = document.createElement('div');
    content.className = 'ux-plan-node-content';

    const headerRow = document.createElement('div');
    headerRow.className = 'ux-plan-node-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'ux-plan-node-title';
    titleEl.textContent = node.title || 'Untitled';
    headerRow.appendChild(titleEl);

    if (node.ctx?.iteration && node.ctx.iteration > 0) {
      const iter = document.createElement('span');
      iter.className = 'ux-plan-node-iter';
      iter.textContent = `(#${node.ctx.iteration})`;
      headerRow.appendChild(iter);
    }

    if (node.ctx?.statePath?.length) {
      const phase = document.createElement('span');
      phase.className = 'ux-plan-node-phase';
      phase.textContent = node.ctx.statePath[node.ctx.statePath.length - 1] || node.ctx.statePath[0];
      headerRow.appendChild(phase);
    }

    content.appendChild(headerRow);

    if (node.description) {
      const desc = document.createElement('div');
      desc.className = 'ux-plan-node-desc';
      desc.textContent = node.description;
      content.appendChild(desc);
    }

    if (node.ctx?.statePath?.length || node.observations?.length) {
      const trace = document.createElement('div');
      trace.className = 'ux-plan-trace';

      const traceHeader = document.createElement('div');
      traceHeader.className = 'ux-plan-trace-header';
      traceHeader.textContent = '+ trace';
      if (node.ctx?.statePath?.length) {
        traceHeader.textContent = '+ trace (' + node.ctx.statePath.join(' → ') + ')';
      }

      const traceBody = document.createElement('div');
      traceBody.className = 'ux-plan-trace-body';

      for (const p of (node.ctx?.statePath || [])) {
        const phaseEl = document.createElement('div');
        phaseEl.className = 'ux-plan-trace-phase';
        phaseEl.dataset.phaseType = p;
        phaseEl.textContent = p;
        traceBody.appendChild(phaseEl);
      }

      for (const o of (node.observations || []).slice(-5)) {
        const oel = document.createElement('div');
        oel.className = 'ux-plan-obs';
        oel.dataset.type = o.type;
        oel.textContent = o.message;
        traceBody.appendChild(oel);
      }

      traceHeader.addEventListener('click', () => {
        traceBody.classList.toggle('open');
        traceHeader.textContent = traceBody.classList.contains('open') ? '- trace' : '+ trace';
      });

      trace.appendChild(traceHeader);
      trace.appendChild(traceBody);
      content.appendChild(trace);
    }

    el.appendChild(content);

    const actions = document.createElement('div');
    actions.className = 'ux-plan-node-actions';
    const retryBtn = document.createElement('button');
    retryBtn.className = 'ux-plan-node-action';
    retryBtn.textContent = '↺';
    retryBtn.title = 'Retry';
    retryBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ux:agentic.update', {
        detail: { planId: this.plan?.id, nodeId: node.id, action: 'retry' },
        bubbles: true, composed: true,
      }));
    });

    const skipBtn = document.createElement('button');
    skipBtn.className = 'ux-plan-node-action';
    skipBtn.textContent = '→';
    skipBtn.title = 'Skip';
    skipBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ux:agentic.update', {
        detail: { planId: this.plan?.id, nodeId: node.id, action: 'skip' },
        bubbles: true, composed: true,
      }));
    });

    actions.appendChild(retryBtn);
    actions.appendChild(skipBtn);
    el.appendChild(actions);

    if (node.children?.length) {
      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'ux-plan-node-children';
      for (const child of node.children) {
        childrenWrap.appendChild(this.buildNodeElement(child, depth + 1));
      }
      el.appendChild(childrenWrap);
    }

    return el;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-agentic-plan-tree')) {
  customElements.define('ux-agentic-plan-tree', UxPlanTree);
}
