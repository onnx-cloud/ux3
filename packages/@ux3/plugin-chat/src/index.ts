import type { Plugin } from '../../../../src/plugin/registry';
import { UxChatMessages } from './chat-messages.js';

const version = '0.1.0';

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
