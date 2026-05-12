import type { Plugin } from '../../../../src/plugin/registry';
import { UxChatMessages } from './chat-messages.js';
import { UxChatComposer } from './chat-composer.js';
import { UxChatMessenger } from './chat-messenger.js';

const version = '0.1.0';

const ChatPlugin: Plugin = {
  name: '@ux3/ux-chat',
  version,
  description: 'Chat widget for UX3',
  install() {
    if (!customElements.get('ux-chat-messages')) {
      customElements.define('ux-chat-messages', UxChatMessages);
    }
    if (!customElements.get('ux-chat-composer')) {
      customElements.define('ux-chat-composer', UxChatComposer);
    }
    if (!customElements.get('ux-chat-messenger')) {
      customElements.define('ux-chat-messenger', UxChatMessenger);
    }
  },
};

export { UxChatMessages, UxChatComposer, UxChatMessenger };
export default ChatPlugin;
