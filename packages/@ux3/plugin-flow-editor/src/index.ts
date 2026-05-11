import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxFlowEditor } from './flow-editor.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const FlowEditorPlugin: Plugin = {
  name: '@ux3/plugin-flow-editor',
  version,
  description: 'Flow editor widget for UX3',
  install() {
    if (!customElements.get('ux-flow-editor')) {
      customElements.define('ux-flow-editor', UxFlowEditor);
    }
  },
};

export { UxFlowEditor };
export default FlowEditorPlugin;
