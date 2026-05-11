import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxPivotTable } from './pivot-table.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

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
