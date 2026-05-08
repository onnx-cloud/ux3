import { UxBase } from './base.js';

export class UxFlowEditor extends UxBase {
  private svg!: SVGElement;
  private nodes: NodeData[] = [];
  private edges: EdgeData[] = [];
  private dragging: { node: string; ox: number; oy: number } | null = null;
  private connecting: { from: string; line: SVGLineElement } | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; overflow: auto; }
        svg { width: 100%; height: 500px; background: var(--ux-flow-bg, #f9fafb); cursor: crosshair; }
        .node { cursor: move; }
        .node rect { fill: var(--ux-flow-node, #fff); stroke: var(--ux-flow-node-stroke, #d1d5db); rx: 6; }
        .node text { font-size: 12px; fill: var(--ux-flow-text, #374151); text-anchor: middle; dominant-baseline: central; pointer-events: none; }
        .handle { fill: var(--ux-flow-handle, #9ca3af); cursor: pointer; }
        .handle:hover { fill: var(--ux-flow-handle-hover, #3b82f6); }
        .edge { stroke: var(--ux-flow-edge, #9ca3af); stroke-width: 2; fill: none; marker-end: url(#arrow); }
        .temp-edge { stroke: var(--ux-flow-edge, #9ca3af); stroke-width: 2; stroke-dasharray: 6 3; }
      </style>
      <svg>
        <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#9ca3af"/></marker></defs>
      </svg>
    `;
    this.svg = this.shadowRoot!.querySelector('svg')!;
    this.loadData();
  }

  private loadData(): void {
    this.nodes = Array.from(this.querySelectorAll('[data-node]')).map((el, i) => ({
      id: (el as HTMLElement).dataset.node!,
      x: parseFloat((el as HTMLElement).dataset.x || String(50 + i * 150)),
      y: parseFloat((el as HTMLElement).dataset.y || '80'),
      label: (el as HTMLElement).dataset.label || (el as HTMLElement).dataset.node!,
    }));
    this.edges = Array.from(this.querySelectorAll('[data-edge]')).map(el => ({
      from: (el as HTMLElement).dataset.from!,
      to: (el as HTMLElement).dataset.to!,
    }));
    this.render();
  }

  private render(): void {
    // Clear non-defs
    while (this.svg.lastChild && this.svg.lastChild.nodeName !== 'defs') {
      this.svg.removeChild(this.svg.lastChild);
    }
    // Edges
    for (const edge of this.edges) {
      const from = this.nodes.find(n => n.id === edge.from);
      const to = this.nodes.find(n => n.id === edge.to);
      if (!from || !to) continue;
      const line = this.svgEl('line', {
        class: 'edge', x1: from.x + 60, y1: from.y + 20, x2: to.x, y2: to.y + 20,
      });
      this.svg.appendChild(line);
    }
    // Nodes
    for (const node of this.nodes) {
      const g = this.svgEl('g', { class: 'node', transform: `translate(${node.x},${node.y})` });
      g.appendChild(this.svgEl('rect', { width: 120, height: 40 }));
      g.appendChild(this.svgEl('text', { x: 60, y: 20, textContent: node.label } as any));
      // Output handle (right)
      const outH = this.svgEl('circle', { class: 'handle', cx: 120, cy: 20, r: 6, 'data-node': node.id });
      g.appendChild(outH);
      // Input handle (left)
      g.appendChild(this.svgEl('circle', { class: 'handle', cx: 0, cy: 20, r: 6, 'data-node': node.id }));
      this.svg.appendChild(g);
    }

    // Events
    this.svg.querySelectorAll('.node').forEach(g => {
      g.addEventListener('mousedown', (e) => this.startDrag(e as MouseEvent));
    });
    this.svg.querySelectorAll('.handle').forEach(h => {
      h.addEventListener('mousedown', (e) => { e.stopPropagation(); this.startConnect(e as MouseEvent); });
    });
    this.svg.addEventListener('mousemove', (e) => this.onMove(e));
    this.svg.addEventListener('mouseup', () => this.onUp());
    this.svg.addEventListener('dblclick', (e) => this.addNode(e));
  }

  private startDrag(e: MouseEvent): void {
    const g = (e.target as Element).closest('.node');
    if (!g) return;
    const nodeId = g.querySelector('[data-node]')?.getAttribute('data-node') || '';
    const match = /translate\(([\d.]+),\s*([\d.]+)\)/.exec(g.getAttribute('transform') || '');
    if (!match) return;
    this.dragging = { node: nodeId, ox: e.clientX - parseFloat(match[1]), oy: e.clientY - parseFloat(match[2]) };
  }

  private startConnect(e: MouseEvent): void {
    const handle = e.target as Element;
    const nodeId = handle.getAttribute('data-node') || '';
    const isOutput = parseFloat(handle.getAttribute('cx') || '0') > 10;
    if (!isOutput) return;
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const line = this.svgEl('line', { class: 'temp-edge', x1: node.x + 120, y1: node.y + 20, x2: e.offsetX, y2: e.offsetY }) as SVGLineElement;
    this.svg.appendChild(line);
    this.connecting = { from: nodeId, line };
  }

  private onMove(e: MouseEvent): void {
    if (this.dragging) {
      const node = this.nodes.find(n => n.id === this.dragging!.node);
      if (node) { node.x = e.clientX - this.dragging.ox; node.y = e.clientY - this.dragging.oy; }
      this.render();
    }
    if (this.connecting) {
      const rect = this.svg.getBoundingClientRect();
      this.connecting.line.setAttribute('x2', String(e.clientX - rect.left));
      this.connecting.line.setAttribute('y2', String(e.clientY - rect.top));
    }
  }

  private onUp(): void {
    if (this.connecting) {
      this.connecting.line.remove();
      const targetHandle = document.elementFromPoint(
        (window as any).__uxConnX || 0, (window as any).__uxConnY || 0
      );
      const targetNode = targetHandle?.getAttribute('data-node');
      if (targetNode && targetNode !== this.connecting.from) {
        this.edges.push({ from: this.connecting.from, to: targetNode });
        this.render();
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'CONNECT', from: this.connecting.from, to: targetNode }
        }));
      }
      this.connecting = null;
    }
    this.dragging = null;
  }

  private addNode(e: MouseEvent): void {
    const rect = this.svg.getBoundingClientRect();
    const id = 'n' + (this.nodes.length + 1);
    this.nodes.push({ id, x: e.clientX - rect.left - 60, y: e.clientY - rect.top - 20, label: id });
    this.render();
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'ADD', id } }));
  }

  private svgEl(tag: string, attrs: Record<string, any>): Element {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'textContent') el.textContent = v;
      else el.setAttribute(k, String(v));
    }
    return el;
  }
}

interface NodeData { id: string; x: number; y: number; label: string; }
interface EdgeData { from: string; to: string; }
