import { afterEach, describe, expect, it, vi } from 'vitest';
import { UxChatMessenger } from '@ux3/plugin-chat/chat-messenger';

declare global {
  interface Window {
    __ux3McpService?: any;
  }
}

describe('ux-chat-messenger MCP agent flow', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete window.__ux3McpService;
    vi.restoreAllMocks();
  });

  it('creates/reuses a session and appends user+assistant messages', async () => {
    if (!customElements.get('ux-chat-messenger')) {
      customElements.define('ux-chat-messenger', UxChatMessenger);
    }

    const send = vi.fn(async () => ({
      role: 'assistant',
      content: 'Hello from agent',
      timestamp: Date.now(),
    }));

    const session = {
      id: 'sess-1',
      state: 'idle',
      mode: 'queue',
      send,
      setMode: vi.fn(),
    };

    const createSession = vi.fn(() => session);

    window.__ux3McpService = {
      listAgents: () => ['default'],
      getSession: () => undefined,
      createSession,
    };

    const el = document.createElement('ux-chat-messenger') as UxChatMessenger;
    el.setAttribute('agent', 'default');
    el.setAttribute('mode', 'queue');
    document.body.appendChild(el);

    const messageEvents: any[] = [];
    el.addEventListener('ux:message', (e) => messageEvents.push((e as CustomEvent).detail));

    const composer = el.shadowRoot?.querySelector('ux-chat-composer');
    expect(composer).toBeTruthy();
    composer!.dispatchEvent(new CustomEvent('ux:send', {
      bubbles: true,
      composed: true,
      detail: { text: 'Hi there' },
    }));

    await Promise.resolve();
    await Promise.resolve();

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ role: 'user', content: 'Hi there' });
    expect(el.getAttribute('session-id')).toBe('sess-1');

    const messagesEl = el.shadowRoot?.querySelector('ux-chat-messages') as HTMLElement;
    const messages = JSON.parse(messagesEl.getAttribute('messages') || '[]');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messageEvents).toHaveLength(1);
  });

  it('adds a system message when MCP service is unavailable', async () => {
    if (!customElements.get('ux-chat-messenger')) {
      customElements.define('ux-chat-messenger', UxChatMessenger);
    }

    const el = document.createElement('ux-chat-messenger') as UxChatMessenger;
    document.body.appendChild(el);

    const composer = el.shadowRoot?.querySelector('ux-chat-composer');
    composer!.dispatchEvent(new CustomEvent('ux:send', {
      bubbles: true,
      composed: true,
      detail: { text: 'Hi' },
    }));

    await Promise.resolve();
    await Promise.resolve();

    const messagesEl = el.shadowRoot?.querySelector('ux-chat-messages') as HTMLElement;
    const messages = JSON.parse(messagesEl.getAttribute('messages') || '[]');
    expect(messages[messages.length - 1].role).toBe('system');
    expect(String(messages[messages.length - 1].content)).toMatch(/unavailable/i);
  });
});
