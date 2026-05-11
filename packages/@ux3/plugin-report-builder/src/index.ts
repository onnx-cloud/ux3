import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxReportBuilder } from './report-builder.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

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
