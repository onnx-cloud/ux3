import { afterEach, describe, expect, it, vi } from 'vitest';
import McpPlugin, { McpService } from '@ux3/plugin-mcp';

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
          clients: { browser: { type: 'proxy' } },
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
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        ok: true,
        json: async () => ({ result: { content: [{ type: 'text', text: 'ok' }], stopReason: 'end_turn' } }),
      } as any;
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
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
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        ok: true,
        json: async () => ({ result: { content: [{ type: 'text', text: 'ok' }], stopReason: 'end_turn' } }),
      } as any;
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
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
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        ok: true,
        json: async () => ({ result: { content: [{ type: 'text', text: 'ok' }], stopReason: 'end_turn' } }),
      } as any;
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
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
    let toolsCalled = false;
    const fetchMock = vi.fn(async (_url: string, _init?: any) => {
      if (!toolsCalled) {
        toolsCalled = true;
        return { ok: true, json: async () => ({ result: { tools: [] } }) } as any;
      }
      return new Promise((_resolve, reject) => {
        const sig = _init?.signal;
        if (sig) {
          if (sig.aborted) { reject(new DOMException('aborted', 'AbortError')); return; }
          sig.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
      agents: { default: { client: 'browser', servers: ['dev'] } },
    });

    const session = service.createSession('default');
    const sendPromise = session.send({ role: 'user', content: 'test' });

    await new Promise((r) => setTimeout(r, 10));
    session.cancel();

    const result = await sendPromise;
    expect(result.content).toContain('cancelled');
    expect(session.state).toBe('idle');
  });

  it('stream() yields individual ticks for each turn', async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => {
          if (callCount === 2) {
            return {
              result: {
                content: [
                  { type: 'tool_use', name: 'view.list', id: 't1', input: {} },
                  { type: 'text', text: 'answer' },
                ],
                stopReason: 'end_turn',
              },
            };
          }
          if (callCount === 3) {
            return { result: { result: 'tool result ok' } };
          }
          return { result: { tools: [{ name: 'view.list' }] } };
        },
      } as any;
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new McpService({
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
