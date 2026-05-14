import type { Plugin } from '../../../../src/plugin/registry.js';
import { normalizeMathNode, parseMathExpression, serializeMathNode } from './parser.js';
import type { MathNode } from './ir.js';

export interface MathPluginConfig {
  enableInlineMath?: boolean;
  enableBlockMath?: boolean;
}

export interface MathPluginUtils {
  parse: (source: string) => MathNode;
  normalize: (root: MathNode) => MathNode;
  serialize: (root: MathNode) => string;
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
    } as MathPluginUtils;
  },
};

export default MathPlugin;
