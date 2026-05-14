import { describe, expect, it } from 'vitest';
import WebsearchPlugin from '../packages/@ux3/plugin-websearch/src/index.js';

describe('@ux3/plugin-websearch', () => {
  it('exports a plugin object with mcp tools', () => {
    expect(WebsearchPlugin).toBeTypeOf('object');
    expect(WebsearchPlugin.name).toBe('@ux3/plugin-websearch');
    expect(WebsearchPlugin.mcp?.tools?.some((tool: any) => tool.name === 'websearch.query')).toBe(true);
  });

  it('returns provider metadata from queryProviders', async () => {
    const result = await WebsearchPlugin.callTool?.('websearch.queryProviders', {});
    expect(result).toBeTypeOf('object');
    expect((result as any).providers).toBeInstanceOf(Array);
    expect((result as any).providers[0]?.name).toBe('brave');
  });
});
