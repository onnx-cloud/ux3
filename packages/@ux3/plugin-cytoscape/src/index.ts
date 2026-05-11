import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxGraph } from './graph.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const DEFAULT_CDN = 'https://unpkg.com/cytoscape@3.29.2/dist/cytoscape.min.js';

function readConfig(app: any): { bundled?: boolean; cdn?: string; layout?: string } {
  return (CytoscapePlugin as any).config ?? app.config?.plugins?.['@ux3/plugin-cytoscape'] ?? {};
}

function getCytoscape(): any {
  if (typeof window !== 'undefined' && (window as any).cytoscape) return (window as any).cytoscape;
  return null;
}

export const CytoscapePlugin: Plugin = {
  name: '@ux3/plugin-cytoscape',
  version,
  description: 'Cytoscape.js graph visualization for UX3',
  install(app) {
    const cfg = readConfig(app);
    app.registerAsset?.({ type: 'script', src: cfg.cdn ?? DEFAULT_CDN });

    if (!customElements.get('ux-graph')) {
      customElements.define('ux-graph', UxGraph);
    }

    app.registerService?.('graph', () => ({
      create(el: HTMLElement, options: Record<string, unknown> = {}) {
        const cy = getCytoscape();
        if (!cy) throw new Error('@ux3/plugin-cytoscape: Cytoscape.js not loaded');
        return cy({ container: el, ...options });
      },
      layout(graph: any, name: string, options: Record<string, unknown> = {}) {
        return graph.layout({ name, ...options }).run();
      },
      get cytoscape() { return getCytoscape(); },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).cytoscape = { cdn: cfg.cdn ?? DEFAULT_CDN };
  },
};

export { UxGraph };
export default CytoscapePlugin;
