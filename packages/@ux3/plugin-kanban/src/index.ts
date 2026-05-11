import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxKanban } from './kanban.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

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
