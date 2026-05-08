import { UxBase } from './base.js';

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
    this.renderFromData();
  }

  private renderFromData(): void {
    const svg = this.shadowRoot!.querySelector('svg')!;
    const nodeEls = Array.from(this.querySelectorAll('[data-node]'));
    const edgeEls = Array.from(this.querySelectorAll('[data-edge]'));
    const nodes = nodeEls.map((el, i) => ({
      id: (el as HTMLElement).dataset.node!,
      x: parseFloat((el as HTMLElement).dataset.x || String(50 + i * 150)),
      y: parseFloat((el as HTMLElement).dataset.y || '60'),
      label: (el as HTMLElement).dataset.label || (el as HTMLElement).dataset.node!,
    }));

    for (const edge of edgeEls) {
      const from = nodes.find(n => n.id === (edge as HTMLElement).dataset.from);
      const to = nodes.find(n => n.id === (edge as HTMLElement).dataset.to);
      if (from && to) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('class', 'edge');
        l.setAttribute('x1', String(from.x + 60)); l.setAttribute('y1', String(from.y + 20));
        l.setAttribute('x2', String(to.x)); l.setAttribute('y2', String(to.y + 20));
        svg.appendChild(l);
      }
    }
    for (const n of nodes) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node');
      g.setAttribute('transform', `translate(${n.x},${n.y})`);
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('width', '120'); r.setAttribute('height', '40');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '60'); t.setAttribute('y', '20'); t.textContent = n.label;
      g.appendChild(r); g.appendChild(t); svg.appendChild(g);
    }
  }
}
