import { UxBase } from '@ux3/ui/widget/primitives/base';

export class UxWorkflow extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; overflow: auto; }
        svg { width: 100%; height: 300px; background: var(--ux-flow-bg, #f9fafb); }
        .node rect { fill: var(--ux-flow-node, #fff); stroke: var(--ux-flow-node-stroke, #d1d5db); rx: 6; }
        .node text { font-size: 12px; fill: var(--ux-flow-text, #374151); text-anchor: middle; dominant-baseline: central; }
        .edge { stroke: var(--ux-flow-edge, #9ca3af); stroke-width: 2; fill: none; marker-end: url(#arrow); }
      </style>
      <svg><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#9ca3af"/></marker></defs></svg>
    `;
    this.renderFromSlots();
  }

  protected applyData(data: any): void {
    if (!data) return;
    const svg = this.shadowRoot!.querySelector('svg');
    if (!svg) return;
    const nodes: Array<{ id: string; label: string; status: string }> = Array.isArray(data.nodes) ? data.nodes : Array.isArray(data) ? data : [];
    const edges: Array<{ from: string; to: string }> = Array.isArray(data.edges) ? data.edges : [];
    const svgWidth = (nodes.length || 1) * 140 + 20;
    svg.setAttribute('viewBox', `0 0 ${svgWidth} 80`);
    const statusColors: Record<string, string> = { done: '#10b981', active: '#3b82f6', pending: '#d1d5db' };
    svg.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#9ca3af"/></marker></defs>';
    for (const e of edges) {
      const fn = nodes.find(n => n.id === String(e.from) || n.id === e.from);
      const tn = nodes.find(n => n.id === String(e.to) || n.id === e.to);
      if (!fn || !tn) continue;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('class', 'edge');
      l.setAttribute('x1', String(20 + nodes.indexOf(fn) * 140 + 60));
      l.setAttribute('y1', '40');
      l.setAttribute('x2', String(20 + nodes.indexOf(tn) * 140));
      l.setAttribute('y2', '40');
      l.setAttribute('stroke', statusColors[fn.status] || '#d1d5db');
      svg.appendChild(l);
    }
    for (const n of nodes) {
      const i = nodes.indexOf(n);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node');
      g.setAttribute('transform', `translate(${20 + i * 140},${20})`);
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('width', '120');
      r.setAttribute('height', '40');
      r.setAttribute('fill', statusColors[n.status] === '#3b82f6' ? '#dbeafe' : '#fff');
      r.setAttribute('stroke', statusColors[n.status] || '#d1d5db');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '60');
      t.setAttribute('y', '20');
      t.textContent = n.label;
      g.appendChild(r);
      g.appendChild(t);
      svg.appendChild(g);
    }
  }

  private renderFromSlots(): void {
    const svg = this.shadowRoot!.querySelector('svg')!;
    const stepEls = Array.from(this.querySelectorAll('[data-step]'));
    const edgeEls = Array.from(this.querySelectorAll('[data-edge]'));
    const stepCount = stepEls.length || 1;
    const svgWidth = stepCount * 140 + 20;
    svg.setAttribute('viewBox', `0 0 ${svgWidth} 80`);

    const nodes = stepEls.map((el, i) => ({
      id: String(i + 1),
      x: 20 + i * 140,
      y: 20,
      label: (el as HTMLElement).dataset.label || `Step ${i + 1}`,
      status: (el as HTMLElement).dataset.status || 'pending',
    }));

    // Use custom edges from [data-edge] elements if present
    const customEdges: { from: number; to: number }[] = [];
    for (const el of edgeEls) {
      const from = parseInt((el as HTMLElement).dataset.from || '', 10);
      const to = parseInt((el as HTMLElement).dataset.to || '', 10);
      if (!isNaN(from) && !isNaN(to)) customEdges.push({ from, to });
    }

    const statusColors: Record<string, string> = { done: '#10b981', active: '#3b82f6', pending: '#d1d5db' };

    if (customEdges.length > 0) {
      for (const edge of customEdges) {
        const fromNode = nodes.find(n => n.id === String(edge.from));
        const toNode = nodes.find(n => n.id === String(edge.to));
        if (!fromNode || !toNode) continue;
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('class', 'edge');
        l.setAttribute('x1', String(fromNode.x + 60));
        l.setAttribute('y1', '40');
        l.setAttribute('x2', String(toNode.x));
        l.setAttribute('y2', '40');
        l.setAttribute('stroke', statusColors[fromNode.status] || '#d1d5db');
        svg.appendChild(l);
      }
    } else {
      for (let i = 0; i < nodes.length - 1; i++) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('class', 'edge');
        l.setAttribute('x1', String(nodes[i].x + 60));
        l.setAttribute('y1', '40');
        l.setAttribute('x2', String(nodes[i + 1].x));
        l.setAttribute('y2', '40');
        l.setAttribute('stroke', statusColors[nodes[i].status] || '#d1d5db');
        svg.appendChild(l);
      }
    }

    for (const n of nodes) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node');
      g.setAttribute('transform', `translate(${n.x},${n.y})`);
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('width', '120');
      r.setAttribute('height', '40');
      r.setAttribute('fill', statusColors[n.status] === '#3b82f6' ? '#dbeafe' : '#fff');
      r.setAttribute('stroke', statusColors[n.status] || '#d1d5db');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '60');
      t.setAttribute('y', '20');
      t.textContent = n.label;
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('font-size', '12');
      g.appendChild(r);
      g.appendChild(t);
      svg.appendChild(g);
    }
  }
}
