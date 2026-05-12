import { afterEach, describe, expect, it, vi } from 'vitest';
import McpPlugin, { McpService } from '@ux3/plugin-mcp';

function mcplResponse(tools: any[]) {
  return { ok: true, json: async () => ({ result: { tools } }) } as any;
}

function llmResponse(content: string, toolCalls?: Array<{ name: string; args: any }>) {
  const message: any = {};
  if (content) message.content = content;
  if (toolCalls?.length) {
    message.tool_calls = toolCalls.map((tc, i) => ({
      id: `tc_${i}`,
      function: { name: tc.name, arguments: JSON.stringify(tc.args) },
    }));
  }
  return { ok: true, json: async () => ({ choices: [{ message }] }) } as any;
}

function fetchMockFor(urlPattern: string) {
  return vi.fn(async (url: string, _init?: any) => {
    const p = new URL(url, 'http://localhost');
    if (p.pathname.startsWith('/$/mcp')) {
      const body = JSON.parse(_init?.body ?? '{}');
      if (body.method === 'tools/list') return mcplResponse([]);
      return mcplResponse([]);
    }
    return llmResponse('ok');
  });
}

describe('@ux3/plugin-mcp agent sessions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('install() keeps configured agents available on runtime service', () => {
    const app: any = {
      services: {},
      utils: {},
      registerService(name: string, factory: () => unknown) {
        this.services[name] = factory();
      },
    };

    (McpPlugin.install as any).call(
      {
        config: {
          mcpServers: { dev: { type: 'dev' } },
          clients: { browser: { type: 'generic' } },
          agents: {
            default: {
              client: 'browser',
              servers: ['dev'],
              defaultMode: 'queue',
            },
          },
        },
      },
      app
    );

    const service = app.services.mcp as McpService;
    expect(service).toBeDefined();
    expect(service.listAgents()).toContain('default');
    expect(service.listServers()).toContainEqual(expect.stringMatching(/dev/));
    expect(service.listClients()).toContainEqual(expect.stringMatching(/browser/));
  });

  it('queues concurrent sends in queue mode and preserves history', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: any) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      const p = new URL(url, 'http://localhost');
      if (p.pathname.startsWith('/$/mcp')) return mcplResponse([]);
      return llmResponse('ok');
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      agents: {
        default: {
          client: 'browser',
          servers: ['dev'],
          defaultMode: 'queue',
        },
      },
    });

    const session = service.createSession('default');
    const p1 = session.send({ role: 'user', content: 'first' });
    const p2 = session.send({ role: 'user', content: 'second' });

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.role).toBe('assistant');
    expect(r2.role).toBe('assistant');
    expect(session.history).toHaveLength(4);
    expect(session.state).toBe('idle');
  });

  it('rejects concurrent sends in blocking mode', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: any) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const p = new URL(url, 'http://localhost');
      if (p.pathname.startsWith('/$/mcp')) return mcplResponse([]);
      return llmResponse('ok');
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      agents: {
        default: {
          client: 'browser',
          servers: ['dev'],
        },
      },
    });

    const session = service.createSession('default', { mode: 'blocking' });
    const first = session.send({ role: 'user', content: 'one' });
    await expect(session.send({ role: 'user', content: 'two' })).rejects.toThrow(/busy/i);
    await first;
  });

  it('steering mode interrupts active request and processes new message', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: any) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const p = new URL(url, 'http://localhost');
      if (p.pathname.startsWith('/$/mcp')) return mcplResponse([]);
      return llmResponse('ok');
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      agents: {
        default: {
          client: 'browser',
          servers: ['dev'],
        },
      },
    });

    const session = service.createSession('default', { mode: 'steering' });
    const p1 = session.send({ role: 'user', content: 'first' });
    const p2 = session.send({ role: 'user', content: 'second' });

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.role).toBeDefined();
    expect(r2.role).toBeDefined();
    expect(session.state).toBe('idle');
  });

  it('cancel() stops active request and resets state', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: any) => {
      const p = new URL(_url, 'http://localhost');
      if (p.pathname.startsWith('/$/mcp')) return mcplResponse([]);
      await new Promise((r) => setTimeout(r, 100));
      const sig = _init?.signal;
      if (sig?.aborted) throw new DOMException('aborted', 'AbortError');
      return llmResponse('ok');
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      agents: { default: { client: 'browser', servers: ['dev'] } },
    });

    const session = service.createSession('default');
    session.send({ role: 'user', content: 'test' });
    await new Promise((r) => setTimeout(r, 20));
    session.cancel();
    expect(session.state).toBe('idle');
  });

  it('stream() yields individual ticks for each turn', async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async (_url: string, _init?: any) => {
      callCount++;
      const p = new URL(_url, 'http://localhost');

      if (p.pathname.startsWith('/$/mcp')) {
        // MCP call: first is tools/list, later ones are tools/call
        if (callCount === 1) return mcplResponse([{ name: 'view.list' }]);
        if (callCount === 3) return { ok: true, json: async () => ({ result: { result: 'tool result ok' } }) } as any;
        return mcplResponse([]);
      }

      // LLM calls
      if (callCount === 2) {
        return llmResponse('answer', [{ name: 'view.list', args: {} }]);
      }
      return llmResponse('final answer');
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      agents: {
        default: { client: 'browser', servers: ['dev'], maxIterations: 3 },
      },
    });

    const session = service.createSession('default');
    const ticks: any[] = [];
    for await (const tick of session.stream({ role: 'user', content: 'test' })) {
      ticks.push(tick);
    }

    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.some((t: any) => t.role === 'tool_call')).toBe(true);
    expect(ticks.some((t: any) => t.role === 'tool_result')).toBe(true);
    expect(ticks.some((t: any) => t.role === 'assistant')).toBe(true);
    expect(session.state).toBe('idle');
  });

  it('resets session state and clears history', async () => {
    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      agents: {
        default: { client: 'browser', servers: ['dev'] },
      },
    });

    const session = service.createSession('default');
    session.history.push({ role: 'user', content: 'test', timestamp: Date.now() });
    expect(session.history).toHaveLength(1);
    session.reset();
    expect(session.history).toHaveLength(0);
    expect(session.state).toBe('idle');
  });

  it('getAgentConfig returns agent configuration', () => {
    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      agents: {
        bot: { client: 'browser', servers: ['dev'], maxIterations: 5 },
      },
    });

    const config = service.getAgentConfig('bot');
    expect(config).toBeDefined();
    expect(config?.maxIterations).toBe(5);
    expect(service.getAgentConfig('nonexistent')).toBeUndefined();
  });

  it('supports multiple named servers in MCP calls', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      return {
        ok: true,
        json: async () => {
          if (url.includes('/dev')) {
            return { result: { tools: [{ name: 'dev-tool' }] } };
          }
          return { result: { tools: [{ name: 'server-tool' }] } };
        },
      } as any;
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
      clients: { browser: { type: 'generic' } },
      mcpServers: {
        dev: { type: 'dev' },
        custom: { type: 'http', url: 'http://localhost:9999' },
      },
    });

    expect(service.listServers()).toHaveLength(2);

    const devData = await service.loadMCPData('dev');
    expect(devData.mcpAvailable).toBe(true);

    const customData = await service.loadMCPData('custom');
    expect(customData.mcpAvailable).toBe(true);
  });
});
