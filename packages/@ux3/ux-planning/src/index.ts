import type { Plugin } from '../../../../src/plugin/registry';
import { UxCalendar } from './calendar.js';
import { UxKanban } from './kanban.js';
import { UxFlowEditor } from './flow-editor.js';
import { UxGantt } from './gantt.js';

const version = '0.2.0';

const PlanningPlugin: Plugin = {
  name: '@ux3/ux-planning',
  version,
  description: 'Unified planning & scheduling widgets (calendar, kanban, flow editor, gantt)',
  install() {
    if (!customElements.get('ux-calendar')) {
      customElements.define('ux-calendar', UxCalendar);
    }
    if (!customElements.get('ux-kanban')) {
      customElements.define('ux-kanban', UxKanban);
    }
    if (!customElements.get('ux-flow-editor')) {
      customElements.define('ux-flow-editor', UxFlowEditor);
    }
    if (!customElements.get('ux-gantt')) {
      customElements.define('ux-gantt', UxGantt);
    }
  },
};

export { UxCalendar, UxKanban, UxFlowEditor, UxGantt };
export default PlanningPlugin;
