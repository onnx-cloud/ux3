import type { Plugin } from '../../../../src/plugin/registry';
import { UxPivotTable } from './pivot-table.js';

const version = '0.1.0';

const PivotTablePlugin: Plugin = {
  name: '@ux3/plugin-pivot-table',
  version,
  description: 'Pivot table widget for UX3',
  install() {
    if (!customElements.get('ux-pivot-table')) {
      customElements.define('ux-pivot-table', UxPivotTable);
    }
  },
};

export { UxPivotTable };
export default PivotTablePlugin;
