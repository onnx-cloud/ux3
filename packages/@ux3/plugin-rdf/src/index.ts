import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const RDFLIB_CDN = 'https://unpkg.com/rdflib@2.2.33/dist/rdflib.min.js';
const CM_CDN = 'https://unpkg.com/codemirror@6.0.1/lib/codemirror.js';

export interface RdfConfig {
  cdn?: string;
  codeMirrorCdn?: string;
}

export interface SparqlResult {
  head: { vars: string[] };
  results: { bindings: Record<string, { type: string; value: string }>[] };
}

function readConfig(app: any): RdfConfig {
  return (RdfPlugin as any).config ?? app.config?.plugins?.['@ux3/plugin-rdf'] ?? {};
}

function getRdflib(): any {
  if (typeof window !== 'undefined' && (window as any).$rdf) {
    return (window as any).$rdf;
  }
  return null;
}

function getCodeMirror(): any {
  if (typeof window !== 'undefined' && (window as any).CodeMirror) {
    return (window as any).CodeMirror;
  }
  return null;
}

export const RdfPlugin: Plugin = {
  name: '@ux3/plugin-rdf',
  version,
  description: 'RDF graph traversal, turtle/N3 parsing, and SPARQL editor for UX3',

  install(app) {
    const cfg = readConfig(app);
    const rdfCdn = cfg.cdn ?? RDFLIB_CDN;
    const cmCdn = cfg.codeMirrorCdn ?? CM_CDN;

    app.registerAsset?.({ type: 'script', src: rdfCdn });
    app.registerAsset?.({ type: 'script', src: cmCdn });

    app.registerService?.('rdf', () => ({
      get store(): any { return getRdflib()?.graph?.() ?? null; },
      parse(data: string, contentType = 'text/turtle'): any {
        const $rdf = getRdflib();
        if (!$rdf) throw new Error('rdflib.js not loaded');
        const store = $rdf.graph();
        try {
          $rdf.parse(data, store, 'http://example.org/', contentType);
        } catch (e) {
          throw new Error(`RDF parse error: ${(e as Error).message}`);
        }
        return store;
      },
      async query(endpoint: string, sparql: string): Promise<SparqlResult> {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sparql-query', Accept: 'application/json' },
          body: sparql,
        });
        if (!res.ok) throw new Error(`SPARQL query failed: ${res.status} ${res.statusText}`);
        return res.json();
      },
      get rdf() { return getRdflib(); },
      get codeMirror() { return getCodeMirror(); },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).rdf = { rdfCdn, cmCdn };
  },
};

export default RdfPlugin;
