import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxFilterBuilder } from './filter-builder.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const FilterBuilderPlugin: Plugin = {
  name: '@ux3/plugin-filter-builder',
  version,
  description: 'Filter builder widget for UX3',
  install() {
    if (!customElements.get('ux-filter-builder')) {
      customElements.define('ux-filter-builder', UxFilterBuilder);
    }
  },
};

export { UxFilterBuilder };
export default FilterBuilderPlugin;
