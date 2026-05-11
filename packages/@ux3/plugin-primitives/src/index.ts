import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.1.0';

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
