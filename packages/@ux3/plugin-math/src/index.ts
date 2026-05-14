import type { Plugin } from '../../../../src/plugin/registry.js';
import { normalizeMathNode, parseMathExpression } from './parser.js';
import { renderMathHtml, renderMathMathML, serializeMathNode } from './render.js';
import type { MathNode } from './ir.js';

export interface MathPluginConfig {
  enableInlineMath?: boolean;
  enableBlockMath?: boolean;
}

export type { MathNode, MathIR } from './ir.js';

export interface MathPluginUtils {
  parse: (source: string) => MathNode;
  normalize: (root: MathNode) => MathNode;
  serialize: (root: MathNode) => string;
  renderHtml: (root: MathNode) => string;
  renderMathML: (root: MathNode) => string;
}

function readConfig(app: any): MathPluginConfig {
  return (
    (MathPlugin as any).config ??
    app?.config?.plugins?.['@ux3/plugin-math'] ??
    app?.config?.plugins?.math ??
    {}
  );
}

export const MathPlugin: Plugin = {
  name: '@ux3/plugin-math',
  version: '0.1.0',
  description: 'Semantic TeX-lite math parser and canonical IR bridge for UX3.',
  displayName: 'Math',
  author: 'UX3 Team',
  categories: ['utility', 'analysis', 'content'],
  ux3PeerVersion: '^0.2.0',
  install(app) {
    const cfg = readConfig(app);
    if (cfg.enableInlineMath === false && cfg.enableBlockMath === false) {
      return;
    }

    (app as any).utils = (app as any).utils || {};
    (app as any).utils.math = {
      parse: parseMathExpression,
      normalize: normalizeMathNode,
      serialize: serializeMathNode,
      renderHtml: renderMathHtml,
      renderMathML: renderMathMathML,
    } as MathPluginUtils;

    const markdownService = app.services?.markdown as any;
    if (markdownService) {
      const mathRenderer = (code: string) => {
        const html = renderMathHtml(parseMathExpression(code));
        return document.createRange().createContextualFragment(html);
      };

      if (typeof markdownService.registerCodeBlockRenderer === 'function') {
        markdownService.registerCodeBlockRenderer('math', mathRenderer);
        markdownService.registerCodeBlockRenderer('latex', mathRenderer);
      }

      if (typeof markdownService.registerInlineCodeRenderer === 'function') {
        markdownService.registerInlineCodeRenderer('math', mathRenderer);
        markdownService.registerInlineCodeRenderer('latex', mathRenderer);
      }

      if (typeof markdownService.registerInlineRenderer === 'function') {
        markdownService.registerInlineRenderer('math', mathRenderer);
        markdownService.registerInlineRenderer('latex', mathRenderer);
      }
    }
  },
};

export const parse = parseMathExpression;
export const normalize = normalizeMathNode;
export const serialize = serializeMathNode;
export const renderHtml = renderMathHtml;
export const renderMathML = renderMathMathML;

export default MathPlugin;
