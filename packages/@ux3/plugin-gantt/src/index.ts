import type { Plugin } from '../../../../src/plugin/registry';
import { UxGantt } from './gantt.js';

const version = '0.1.0';

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
