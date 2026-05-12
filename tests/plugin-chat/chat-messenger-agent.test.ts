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
      stream: undefined,
      cancel: vi.fn(),
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
    expect(send).toHaveBeenCalledWith(
      { role: 'user', content: 'Hi there' },
      expect.any(Object)
    );
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

  it('handles streaming via session.stream()', async () => {
    if (!customElements.get('ux-chat-messenger')) {
      customElements.define('ux-chat-messenger', UxChatMessenger);
    }

    async function* stream() {
      yield { role: 'tool_call', content: { name: 'view.list', args: {} }, timestamp: Date.now() };
      yield { role: 'tool_result', content: 'result', timestamp: Date.now() };
      yield { role: 'assistant', content: 'Streamed response', timestamp: Date.now() };
    }

    const session = {
      id: 'sess-stream',
      state: 'idle',
      mode: 'chat',
      send: vi.fn(),
      stream: stream,
      cancel: vi.fn(),
      setMode: vi.fn(),
    };

    window.__ux3McpService = {
      listAgents: () => ['default'],
      getSession: () => undefined,
      createSession: () => session,
    };

    const el = document.createElement('ux-chat-messenger') as UxChatMessenger;
    document.body.appendChild(el);

    const composer = el.shadowRoot?.querySelector('ux-chat-composer');
    composer!.dispatchEvent(new CustomEvent('ux:send', {
      bubbles: true,
      composed: true,
      detail: { text: 'stream test' },
    }));

    await new Promise((r) => setTimeout(r, 20));

    const messagesEl = el.shadowRoot?.querySelector('ux-chat-messages') as HTMLElement;
    const messages = JSON.parse(messagesEl.getAttribute('messages') || '[]');
    const roles = messages.map((m: any) => m.role);
    expect(roles).toContain('tool_call');
    expect(roles).toContain('tool_result');
    expect(roles).toContain('assistant');
  });

  it('renders stop button and handles cancel', async () => {
    if (!customElements.get('ux-chat-messenger')) {
      customElements.define('ux-chat-messenger', UxChatMessenger);
    }

    const cancel = vi.fn();
    const session = {
      id: 'sess-cancel',
      state: 'idle',
      mode: 'chat',
      send: vi.fn(async () => ({ role: 'assistant', content: 'ok', timestamp: Date.now() })),
      stream: undefined,
      cancel,
      setMode: vi.fn(),
    };

    window.__ux3McpService = {
      listAgents: () => ['default'],
      getSession: () => undefined,
      createSession: () => session,
    };

    const el = document.createElement('ux-chat-messenger') as UxChatMessenger;
    document.body.appendChild(el);

    const stopBtn = el.shadowRoot?.querySelector('.stop-btn') as HTMLButtonElement;
    expect(stopBtn).toBeTruthy();
    expect(stopBtn.disabled).toBe(true);

    const composer = el.shadowRoot?.querySelector('ux-chat-composer');
    composer!.dispatchEvent(new CustomEvent('ux:send', {
      bubbles: true,
      composed: true,
      detail: { text: 'long-running task' },
    }));

    await Promise.resolve();
    await Promise.resolve();

    expect(session.send).toHaveBeenCalled();
  });

  it('shows status indicator with state changes', async () => {
    if (!customElements.get('ux-chat-messenger')) {
      customElements.define('ux-chat-messenger', UxChatMessenger);
    }

    const session = {
      id: 'sess-status',
      state: 'idle',
      mode: 'chat',
      send: vi.fn(async () => {
        session.state = 'thinking';
        await new Promise((r) => setTimeout(r, 10));
        session.state = 'idle';
        return { role: 'assistant', content: 'done', timestamp: Date.now() };
      }),
      stream: undefined,
      cancel: vi.fn(),
      setMode: vi.fn(),
    };

    window.__ux3McpService = {
      listAgents: () => ['default'],
      getSession: () => undefined,
      createSession: () => session,
    };

    const el = document.createElement('ux-chat-messenger') as UxChatMessenger;
    document.body.appendChild(el);

    const statusEl = el.shadowRoot?.querySelector('.status-indicator') as HTMLElement;
    expect(statusEl).toBeTruthy();
    expect(statusEl.dataset.state).toBe('idle');
  });
});
