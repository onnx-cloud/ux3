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
  });

  it('queues concurrent sends in queue mode and preserves history', async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        ok: true,
        json: async () => ({ result: { content: { text: 'ok' } } }),
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(session.history).toHaveLength(4);
    expect(session.state).toBe('idle');
  });

  it('rejects concurrent sends in blocking mode', async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        ok: true,
        json: async () => ({ result: { content: { text: 'ok' } } }),
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
});
