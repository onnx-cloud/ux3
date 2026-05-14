import { describe, it, expect } from 'vitest';
import { SelfPlugin } from '../packages/@ux3/plugin-self/src/index.js';

describe('@ux3/plugin-self', () => {
  it('exports a plugin with the correct name', () => {
    expect(SelfPlugin.name).toBe('@ux3/plugin-self');
    expect(SelfPlugin.version).toBe('0.1.0');
    expect(SelfPlugin.mcp).toBeDefined();
  });

  it('exposes self runtime utilities on installation', async () => {
    const app: any = { config: { plugins: { '@ux3/plugin-self': {} } } };
    await SelfPlugin.install?.(app);
    expect(app.utils.self).toBeDefined();
    expect(typeof app.utils.self.status).toBe('function');
    expect(typeof app.utils.self.info).toBe('function');
  });

  it('supports self MCP tools and resources', async () => {
    const info = await SelfPlugin.callTool?.('self.info', {});
    expect(info).toBeDefined();
    const docs = await SelfPlugin.readResource?.('plugin://self/docs');
    expect(typeof docs).toBe('string');
    expect(docs).toContain('Self-hosted onboarding');
  });

  it('advances onboarding through self.onboarding.step and reflects status', async () => {
    const result = await SelfPlugin.callTool?.('self.onboarding.step', {
      step: 'review',
      action: 'CONFIRM',
      onboarded: true,
      ready: true,
    });

    expect(result).toBeDefined();
    expect((result as any).step).toBe('review');
    expect((result as any).action).toBe('CONFIRM');
    expect((result as any).status).toEqual(expect.objectContaining({ onboarded: true, ready: true }));
  });

  it('returns an array from self.plugin.list', async () => {
    const list = await SelfPlugin.callTool?.('self.plugin.list', {});
    expect(Array.isArray(list)).toBe(true);
  });
});
