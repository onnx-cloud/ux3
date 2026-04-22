import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const DEFAULT_CDN = 'https://unpkg.com/cytoscape@3.29.2/dist/cytoscape.min.js';

export interface CytoscapeConfig {
  /** Load and cache Cytoscape.js from CDN (default: true) */
  bundled?: boolean;
  /** Override the Cytoscape.js CDN URL */
  cdn?: string;
}

export interface GraphCreateOptions {
  /** Cytoscape elements array (nodes and edges) */
  elements?: unknown[];
  /** Cytoscape layout options */
  layout?: { name: string; [key: string]: unknown };
  /** Cytoscape style array */
  style?: unknown[];
  /** Any additional Cytoscape options */
  [key: string]: unknown;
}

function readConfig(app: any): CytoscapeConfig {
  return (
    (CytoscapePlugin as any).config ??
    app.config?.plugins?.['@ux3/plugin-cytoscape'] ??
    {}
  );
}

function getCytoscape(): any {
  if (typeof window !== 'undefined' && (window as any).cytoscape) {
    return (window as any).cytoscape;
  }
  return null;
}

export const CytoscapePlugin: Plugin = {
  name: '@ux3/plugin-cytoscape',
  version,
  description: 'Cytoscape.js graph visualization for UX3',

  install(app) {
    const cfg = readConfig(app);
    const cdnUrl = cfg.cdn ?? DEFAULT_CDN;

    app.registerAsset?.({ type: 'script', src: cdnUrl });

    app.registerService?.('graph', () => ({
      /**
       * Create a Cytoscape graph in the given container element.
       *
       * @param el       The container HTMLElement.
       * @param options  Cytoscape init options (elements, layout, style, …).
       */
      create(el: HTMLElement, options: GraphCreateOptions = {}) {
        const cytoscape = getCytoscape();
        if (!cytoscape) {
          throw new Error(
            '@ux3/plugin-cytoscape: Cytoscape.js is not loaded. ' +
            'Make sure bundled:true is set in the plugin config or load the library manually.'
          );
        }
        return cytoscape({ container: el, ...options });
      },

      /**
       * Run a named layout on an existing Cytoscape graph instance.
       */
      layout(graph: any, name: string, options: Record<string, unknown> = {}) {
        return graph.layout({ name, ...options }).run();
      },

      /** Return the raw cytoscape global if available. */
      get cytoscape() {
        return getCytoscape();
      },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).cytoscape = { cdn: cdnUrl };
  },
};

export default CytoscapePlugin;
