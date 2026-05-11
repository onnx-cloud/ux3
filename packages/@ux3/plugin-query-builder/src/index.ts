import type { Plugin } from '../../../../src/plugin/registry';
import { UxQueryBuilder } from './query-builder.js';

const version = '0.1.0';

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
