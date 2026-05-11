import type { Plugin } from '../../../../src/plugin/registry';
import { UxFlowEditor } from './flow-editor.js';

const version = '0.1.0';

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
