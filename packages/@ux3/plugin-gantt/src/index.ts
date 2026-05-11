import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxGantt } from './gantt.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const GanttPlugin: Plugin = {
  name: '@ux3/plugin-gantt',
  version,
  description: 'Gantt chart widget for UX3',
  install() {
    if (!customElements.get('ux-gantt')) {
      customElements.define('ux-gantt', UxGantt);
    }
  },
};

export { UxGantt };
export default GanttPlugin;
