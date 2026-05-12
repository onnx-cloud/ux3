import type { Plugin } from '../../../../src/plugin/registry';
import { UxPivotTable } from './pivot-table.js';
import { UxFilterBuilder } from './filter-builder.js';
import { UxQueryBuilder } from './query-builder.js';
import { UxReportBuilder } from './report-builder.js';

const version = '0.2.0';

const DataBuildersPlugin: Plugin = {
  name: '@ux3/ux-data-builders',
  version,
  description: 'Unified data manipulation widgets (pivot tables, filters, queries, reports)',
  install() {
    if (!customElements.get('ux-pivot-table')) {
      customElements.define('ux-pivot-table', UxPivotTable);
    }
    if (!customElements.get('ux-filter-builder')) {
      customElements.define('ux-filter-builder', UxFilterBuilder);
    }
    if (!customElements.get('ux-query-builder')) {
      customElements.define('ux-query-builder', UxQueryBuilder);
    }
    if (!customElements.get('ux-report-builder')) {
      customElements.define('ux-report-builder', UxReportBuilder);
    }
  },
};

export { UxPivotTable, UxFilterBuilder, UxQueryBuilder, UxReportBuilder };
export default DataBuildersPlugin;
