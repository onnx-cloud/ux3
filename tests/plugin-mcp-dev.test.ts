import { describe, expect, it, vi } from 'vitest';
import { McpDevPlugin } from '@ux3/plugin-mcp-dev';

describe('@ux3/plugin-mcp-dev', () => {
  it('exports the plugin metadata and MCP config', () => {
    expect(McpDevPlugin.name).toBe('@ux3/plugin-mcp-dev');
    expect(McpDevPlugin.mcp).toBeDefined();
    expect(Array.isArray(McpDevPlugin.mcp.tools)).toBe(true);
    expect(McpDevPlugin.mcp.tools.some((tool: any) => tool.name === 'dev.project.info')).toBe(true);
  });

  it('installs and exposes a dev MCP service on the app', async () => {
    const app: any = { config: { plugins: {} }, utils: {}, registerService: vi.fn() };
    await McpDevPlugin.install?.(app);
    expect(typeof app.utils.mcpDev?.callTool).toBe('function');
    expect(typeof app.utils.mcpDev?.readResource).toBe('function');
  });

  it('returns project metadata from dev.project.info', async () => {
    const result = await McpDevPlugin.callTool?.('dev.project.info', {});
    expect(result).toBeDefined();
    expect((result as any).projectDir).toBeDefined();
    expect((result as any).timestamp).toBeDefined();
  });

  it('serves developer docs from plugin://mcp-dev/docs', async () => {
    const docs = await McpDevPlugin.readResource?.('plugin://mcp-dev/docs');
    expect(typeof docs).toBe('string');
    expect(docs).toContain('developer');
  });
});
