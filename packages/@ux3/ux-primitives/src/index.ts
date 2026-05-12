import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.1.0';

const PrimitivesPlugin: Plugin = {
  name: '@ux3/ux-primitives',
  version,
  description: 'UI primitives and utility components for UX3',
  install() {
    // Primitives are registered on demand via custom elements registry
  },
};

export default PrimitivesPlugin;
