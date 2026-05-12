import { UxBase } from '../../../../src/ui/widget/primitives/base';
import { registerLightStyle } from '../../../../src/ui/style-registry';

const STYLE_ID = 'ux-graph-style';
const STYLE_CSS = `
  ux-graph { display: block; min-height: 320px; position: relative; }
  ux-graph .graph-container { width: 100%; height: 100%; min-height: 320px; }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxGraph extends UxBase {
  private container: HTMLElement | null = null;
  private graphInstance: any = null;
  private _rendered = false;

  protected onConnected(): void {
    super.onConnected();
if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
    this.initGraph();
  }

  protected onDisconnected(): void {
    if (this.graphInstance && typeof this.graphInstance.destroy === 'function') {
      this.graphInstance.destroy();
      this.graphInstance = null;
    }
    super.onDisconnected();
  }

  protected applyData(data: any): void {
    if (this.graphInstance && data?.elements) {
      this.graphInstance.json({ elements: data.elements });
      this.graphInstance.center();
      this.graphInstance.fit(undefined, 40);
    }
  }

  private async initGraph(): Promise<void> {
    const app = (window as any).__ux3App;
    const graphSvc = app?.services?.graph;
    if (!graphSvc || !this.container) return;

    const cytoscape = graphSvc.cytoscape;
    if (!cytoscape) {
      setTimeout(() => this.initGraph(), 200);
      return;
    }

    const rawNodes = this.getAttribute('nodes');
    let elements: any[] = [];
    if (rawNodes) {
      try { elements = JSON.parse(rawNodes); } catch {}
    } else {
      elements = [];
    }

    this.graphInstance = cytoscape({
      container: this.container,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'var(--ux-graph-node-bg, #3b82f6)',
            'label': 'data(label)',
            'color': 'var(--ux-graph-node-text, #fff)',
            'font-size': '11px',
            'text-valign': 'center',
            'text-halign': 'center',
            'padding': '8px',
            'width': 'label',
            'height': 'label',
            'shape': 'round-rectangle',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': 'var(--ux-graph-edge, #94a3b8)',
            'target-arrow-color': 'var(--ux-graph-edge, #94a3b8)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': 'var(--ux-graph-edge-label, #64748b)',
          },
        },
      ],
      layout: { name: 'cose', animate: false },
    });

    setTimeout(() => {
      if (this.graphInstance) {
        this.graphInstance.center();
        this.graphInstance.fit(undefined, 40);
      }
    }, 100);
  }

  private render(): void {
    this.innerHTML = '';
    this.container = document.createElement('div');
    this.container.className = 'graph-container';
    this.appendChild(this.container);
  }
}
