import type { Plugin } from '../../../../src/plugin/registry';
import { UxReportBuilder } from './report-builder.js';

const version = '0.1.0';

const ReportBuilderPlugin: Plugin = {
  name: '@ux3/plugin-report-builder',
  version,
  description: 'Report builder widget for UX3',
  install() {
    if (!customElements.get('ux-report-builder')) {
      customElements.define('ux-report-builder', UxReportBuilder);
    }
  },
};

export { UxReportBuilder };
export default ReportBuilderPlugin;
