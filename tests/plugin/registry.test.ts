import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry, type Plugin, type PluginMcpServer } from '@ux3/plugin/registry';

describe('PluginRegistry', () => {
  let reg: PluginRegistry;

  beforeEach(() => {
    reg = new PluginRegistry();
  });

  describe('core operations', () => {
    it('registers and retrieves plugins', () => {
      const plugin = { name: 'foo', version: '0.1.0' };
      reg.register(plugin as any);
      expect(reg.has('foo')).toBe(true);
      expect(reg.load('foo')).toBe(plugin);
      expect(reg.list()).toEqual([plugin]);
    });

    it('throws when registering duplicate name', () => {
      const plugin = { name: 'bar', version: '0.1.0' };
      reg.register(plugin as any);
      expect(() => reg.register(plugin as any)).toThrow(/already registered/);
    });

    it('allows force re-registration for hot reload', () => {
      const plugin = { name: 'test', version: '1.0.0' };
      const updated = { name: 'test', version: '2.0.0' };
      reg.register(plugin as any);
      reg.register(updated as any, true);
      expect(reg.load('test')?.version).toBe('2.0.0');
    });

    it('enforces dependency ordering', () => {
      const dependent = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['missing'],
      };
      expect(() => reg.register(dependent as any)).toThrow(
        /requires.*to be registered first/
      );
    });

    it('clears registry', () => {
      reg.register({ name: 'x', version: '0' } as any);
      reg.clear();
      expect(reg.has('x')).toBe(false);
      expect(reg.list()).toHaveLength(0);
    });
  });

  describe('listByCategory', () => {
    beforeEach(() => {
      reg.register({
        name: '@ux3/plugin-chat',
        version: '1.0.0',
        categories: ['ui', 'service'],
      } as any);
      reg.register({
        name: '@ux3/plugin-form',
        version: '1.0.0',
        categories: ['ui'],
      } as any);
      reg.register({
        name: '@ux3/plugin-auth',
        version: '1.0.0',
        categories: ['auth', 'service'],
      } as any);
      reg.register({
        name: '@ux3/plugin-no-cat',
        version: '1.0.0',
      } as any);
    });

    it('filters plugins by category', () => {
      const uiPlugins = reg.listByCategory('ui');
      expect(uiPlugins).toHaveLength(2);
      expect(uiPlugins.map(p => p.name)).toContain('@ux3/plugin-chat');
      expect(uiPlugins.map(p => p.name)).toContain('@ux3/plugin-form');
    });

    it('returns empty for non-existent category', () => {
      const result = reg.listByCategory('nonexistent');
      expect(result).toHaveLength(0);
    });

    it('handles plugins without categories', () => {
      const uiPlugins = reg.listByCategory('ui');
      expect(uiPlugins).toHaveLength(2);
      expect(uiPlugins.every(p => p.categories?.includes('ui'))).toBe(true);
    });

    it('returns plugins in multiple categories', () => {
      const servicePlugins = reg.listByCategory('service');
      expect(servicePlugins).toHaveLength(2);
      expect(servicePlugins.map(p => p.name)).toContain('@ux3/plugin-chat');
      expect(servicePlugins.map(p => p.name)).toContain('@ux3/plugin-auth');
    });
  });

  describe('exportMetadata', () => {
    it('exports complete metadata for all plugins', () => {
      reg.register({
        name: '@ux3/plugin-chat',
        version: '1.0.0',
        description: 'Chat UI',
        displayName: 'Chat',
        author: 'UX3 Team',
        categories: ['ui'],
        ux3PeerVersion: '^1.0.0',
        dependencies: [],
        mcp: { tools: [{ name: 'test', description: '', inputSchema: {} }] },
      } as any);
      reg.register({
        name: '@ux3/plugin-minimal',
        version: '2.0.0',
      } as any);

      const metadata = reg.exportMetadata();
      expect(metadata).toHaveLength(2);

      const chatMeta = metadata.find(m => m.name === '@ux3/plugin-chat');
      expect(chatMeta).toMatchObject({
        name: '@ux3/plugin-chat',
        version: '1.0.0',
        displayName: 'Chat',
        author: 'UX3 Team',
        hasMcp: true,
      });

      const minimalMeta = metadata.find(m => m.name === '@ux3/plugin-minimal');
      expect(minimalMeta?.hasMcp).toBe(false);
    });

    it('correctly detects MCP servers', () => {
      reg.register({
        name: 'with-tools',
        version: '1.0.0',
        mcp: { tools: [{ name: 'test', description: '', inputSchema: {} }] },
      } as any);
      reg.register({
        name: 'with-resources',
        version: '1.0.0',
        mcp: { resources: [{ uri: 'test', name: 'Test', mimeType: 'text/plain' }] },
      } as any);
      reg.register({
        name: 'no-mcp',
        version: '1.0.0',
      } as any);

      const metadata = reg.exportMetadata();
      expect(metadata.find(m => m.name === 'with-tools')?.hasMcp).toBe(true);
      expect(metadata.find(m => m.name === 'with-resources')?.hasMcp).toBe(true);
      expect(metadata.find(m => m.name === 'no-mcp')?.hasMcp).toBe(false);
    });
  });

  describe('listMcpServers', () => {
    it('returns empty when no MCP servers registered', () => {
      reg.register({ name: 'p1', version: '1.0.0' } as any);
      reg.register({ name: 'p2', version: '1.0.0' } as any);
      expect(reg.listMcpServers()).toHaveLength(0);
    });

    it('lists only plugins with MCP servers', () => {
      const mcp = { tools: [{ name: 'test', description: '', inputSchema: {} }] };
      reg.register({
        name: '@ux3/plugin-with-mcp',
        version: '1.0.0',
        mcp,
      } as any);
      reg.register({
        name: '@ux3/plugin-no-mcp',
        version: '1.0.0',
      } as any);

      const servers = reg.listMcpServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].plugin.name).toBe('@ux3/plugin-with-mcp');
      expect(servers[0].mcp).toEqual(mcp);
    });

    it('returns both tools and resources', () => {
      const mcp: PluginMcpServer = {
        name: 'test',
        tools: [{ name: 'tool1', description: '', inputSchema: {} }],
        resources: [{ uri: 'res://1', name: 'Res1', mimeType: 'text/plain' }],
        systemPrompt: 'Test prompt',
      };
      reg.register({
        name: 'plugin',
        version: '1.0.0',
        mcp,
      } as any);

      const servers = reg.listMcpServers();
      expect(servers[0].mcp?.tools).toHaveLength(1);
      expect(servers[0].mcp?.resources).toHaveLength(1);
      expect(servers[0].mcp?.systemPrompt).toBe('Test prompt');
    });

    it('lists multiple MCP servers', () => {
      reg.register({
        name: 'p1',
        version: '1.0.0',
        mcp: { tools: [{ name: 'test', description: '', inputSchema: {} }] },
      } as any);
      reg.register({
        name: 'p2',
        version: '1.0.0',
        mcp: { resources: [{ uri: 'test', name: 'Test', mimeType: 'text/plain' }] },
      } as any);
      reg.register({
        name: 'p3',
        version: '1.0.0',
      } as any);

      const servers = reg.listMcpServers();
      expect(servers).toHaveLength(2);
      expect(servers.map(s => s.plugin.name)).toEqual(['p1', 'p2']);
    });
  });

  describe('integration: discovery workflow', () => {
    it('supports full plugin discovery', () => {
      reg.register({
        name: '@ux3/plugin-chat',
        version: '1.0.0',
        displayName: 'Chat UI',
        author: 'UX3 Team',
        categories: ['ui'],
        mcp: { tools: [{ name: 'list', description: '', inputSchema: {} }] },
      } as any);
      reg.register({
        name: '@ux3/plugin-form',
        version: '1.0.0',
        displayName: 'Form UI',
        categories: ['ui'],
      } as any);
      reg.register({
        name: '@ux3/plugin-auth',
        version: '1.0.0',
        categories: ['auth'],
        mcp: { resources: [{ uri: 'auth://schemas', name: 'Schemas', mimeType: 'application/json' }] },
      } as any);

      // Discover UI plugins
      const uiPlugins = reg.listByCategory('ui');
      expect(uiPlugins).toHaveLength(2);

      // Export metadata
      const metadata = reg.exportMetadata();
      expect(metadata).toHaveLength(3);
      expect(metadata.filter(m => m.hasMcp)).toHaveLength(2);

      // List MCP servers
      const servers = reg.listMcpServers();
      expect(servers).toHaveLength(2);
    });
  });
});
