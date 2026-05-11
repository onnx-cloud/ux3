import type { Plugin } from '../../../../src/plugin/registry';
import { UxKanban } from './kanban.js';

const version = '0.1.0';

const KanbanPlugin: Plugin = {
  name: '@ux3/plugin-kanban',
  version,
  description: 'Kanban board widget for UX3',
  install() {
    if (!customElements.get('ux-kanban')) {
      customElements.define('ux-kanban', UxKanban);
    }
  },
};

export { UxKanban };
export default KanbanPlugin;
