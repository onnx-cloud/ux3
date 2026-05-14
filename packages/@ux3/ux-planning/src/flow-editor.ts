import { UxBase } from '../../../../src/ui/widget/primitives/base';

export class UxFlowEditor extends UxBase {
  private svg!: SVGElement;
  private nodes: NodeData[] = [];
  private edges: EdgeData[] = [];
  private dragging: { node: string; ox: number; oy: number } | null = null;
  private connecting: { from: string; line: SVGLineElement } | null = null;
  private lastMoveX = 0;
  private lastMoveY = 0;
  private _docMove: ((e: MouseEvent) => void) | null = null;
  private _docUp: (() => void) | null = null;
  private _docKey: ((e: KeyboardEvent) => void) | null = null;

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
    this.svg.addEventListener('dblclick', (e) => this.addNode(e));

    this._docKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.dragging) {
          this.dragging = null;
          this.render();
        }
        if (this.connecting) {
          this.connecting.line.remove();
          this.connecting = null;
        }
      }
    };
    document.addEventListener('keydown', this._docKey);

    this.loadData();
  }

  protected onDisconnected(): void {
    if (this._docKey) { document.removeEventListener('keydown', this._docKey); this._docKey = null; }
    if (this._docMove) { document.removeEventListener('mousemove', this._docMove); this._docMove = null; }
    if (this._docUp) { document.removeEventListener('mouseup', this._docUp); this._docUp = null; }
    this.dragging = null;
    this.connecting = null;
    super.onDisconnected();
  }

  protected applyData(data: FlowData): void {
    if (data?.nodes) this.nodes = data.nodes;
    if (data?.edges) this.edges = data.edges;
    this.render();
  }

  private loadData(): void {
    if (this._boundDataRef) return;
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

  setData(data: FlowData): void {
    this.applyData(data);
  }

  private render(): void {
    while (this.svg.lastChild && this.svg.lastChild.nodeName !== 'defs') {
      this.svg.removeChild(this.svg.lastChild);
    }
    for (const edge of this.edges) {
      const from = this.nodes.find(n => n.id === edge.from);
      const to = this.nodes.find(n => n.id === edge.to);
      if (!from || !to) continue;
      const line = this.svgEl('line', {
        class: 'edge', x1: from.x + 60, y1: from.y + 20, x2: to.x, y2: to.y + 20,
      });
      this.svg.appendChild(line);
    }
    for (const node of this.nodes) {
      const g = this.svgEl('g', { class: 'node', transform: `translate(${node.x},${node.y})` });
      g.appendChild(this.svgEl('rect', { width: 120, height: 40 }));
      g.appendChild(this.svgEl('text', { x: 60, y: 20, textContent: node.label } as any));
      const outH = this.svgEl('circle', { class: 'handle', cx: 120, cy: 20, r: 6, 'data-node': node.id });
      g.appendChild(outH);
      g.appendChild(this.svgEl('circle', { class: 'handle', cx: 0, cy: 20, r: 6, 'data-node': node.id }));
      this.svg.appendChild(g);
    }

    this.svg.querySelectorAll('.node').forEach(g => {
      g.addEventListener('mousedown', (e) => this.startDrag(e as MouseEvent));
    });
    this.svg.querySelectorAll('.handle').forEach(h => {
      h.addEventListener('mousedown', (e) => { e.stopPropagation(); this.startConnect(e as MouseEvent); });
    });
  }

  private startDrag(e: MouseEvent): void {
    const g = (e.target as Element).closest('.node');
    if (!g) return;
    const nodeId = g.querySelector('[data-node]')?.getAttribute('data-node') || '';
    const match = /translate\(([\d.]+),\s*([\d.]+)\)/.exec(g.getAttribute('transform') || '');
    if (!match) return;
    const rect = this.svg.getBoundingClientRect();
    this.dragging = {
      node: nodeId,
      ox: e.clientX - rect.left - parseFloat(match[1]),
      oy: e.clientY - rect.top - parseFloat(match[2]),
    };
    e.preventDefault();

    this._docMove = (ev) => this.onMove(ev);
    this._docUp = () => this.onUp();
    document.addEventListener('mousemove', this._docMove);
    document.addEventListener('mouseup', this._docUp, { once: true });
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

    this._docMove = (ev) => this.onMove(ev);
    this._docUp = () => this.onUp();
    document.addEventListener('mousemove', this._docMove);
    document.addEventListener('mouseup', this._docUp, { once: true });
  }

  private onMove(e: MouseEvent): void {
    this.lastMoveX = e.clientX;
    this.lastMoveY = e.clientY;
    const rect = this.svg.getBoundingClientRect();
    if (this.dragging) {
      const node = this.nodes.find(n => n.id === this.dragging!.node);
      if (node) {
        node.x = e.clientX - rect.left - this.dragging.ox;
        node.y = e.clientY - rect.top - this.dragging.oy;
      }
      this.render();
    }
    if (this.connecting) {
      this.connecting.line.setAttribute('x2', String(e.clientX - rect.left));
      this.connecting.line.setAttribute('y2', String(e.clientY - rect.top));
    }
  }

  private onUp(): void {
    if (this._docMove) { document.removeEventListener('mousemove', this._docMove); this._docMove = null; }
    if (this.dragging) {
      const node = this.nodes.find(n => n.id === this.dragging!.node);
      if (node) {
        this.dispatchEvent(new CustomEvent('ux:flow.move', {
          bubbles: true, composed: true,
          detail: { action: 'FLOW:MOVE', id: node.id, x: node.x, y: node.y },
        }));
      }
    }
    if (this.connecting) {
      this.connecting.line.remove();
      const targetHandle = document.elementFromPoint(this.lastMoveX, this.lastMoveY);
      const targetNode = targetHandle?.getAttribute('data-node');
      if (targetNode && targetNode !== this.connecting.from) {
        this.edges.push({ from: this.connecting.from, to: targetNode });
        this.render();
        this.dispatchEvent(new CustomEvent('ux:flow.connect', {
          bubbles: true, composed: true,
          detail: { action: 'FLOW:CONNECT', from: this.connecting.from, to: targetNode },
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
    this.dispatchEvent(new CustomEvent('ux:flow.add', { bubbles: true, composed: true, detail: { action: 'FLOW:ADD', id } }));
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
interface FlowData { nodes: NodeData[]; edges: EdgeData[]; }
