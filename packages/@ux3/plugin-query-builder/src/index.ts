import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxQueryBuilder } from './query-builder.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const QueryBuilderPlugin: Plugin = {
  name: '@ux3/plugin-query-builder',
  version,
  description: 'Query builder widget for UX3',
  install() {
    if (!customElements.get('ux-query-builder')) {
      customElements.define('ux-query-builder', UxQueryBuilder);
    }
  },
};

export { UxQueryBuilder };
export default QueryBuilderPlugin;
