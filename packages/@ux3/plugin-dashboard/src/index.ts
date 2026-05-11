import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxDashboard } from './dashboard.js';
import { UxKpiBoard } from './kpi-board.js';
import { UxWorkflow } from './workflow.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const DashboardPlugin: Plugin = {
  name: '@ux3/plugin-dashboard',
  version,
  description: 'Dashboard, KPI board, and workflow widgets for UX3',
  install() {
    if (!customElements.get('ux-dashboard')) customElements.define('ux-dashboard', UxDashboard);
    if (!customElements.get('ux-kpi-board')) customElements.define('ux-kpi-board', UxKpiBoard);
    if (!customElements.get('ux-workflow')) customElements.define('ux-workflow', UxWorkflow);
  },
};

export { UxDashboard, UxKpiBoard, UxWorkflow };
export default DashboardPlugin;
