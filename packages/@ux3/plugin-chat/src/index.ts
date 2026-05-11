import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxChatMessages } from './chat-messages.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const ChatPlugin: Plugin = {
  name: '@ux3/plugin-chat',
  version,
  description: 'Chat widget for UX3',
  install() {
    if (!customElements.get('ux-chat-messages')) {
      customElements.define('ux-chat-messages', UxChatMessages);
    }
  },
};

export { UxChatMessages };
export default ChatPlugin;
