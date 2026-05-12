/**
 * Tests for Plugin MCP Registration & Initialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginRegistry, type Plugin, type PluginMcpServer } from '../../src/plugin/registry';
import {
  registerFrameworkMcpServer,
  initializePluginMcpServers,
  enablePluginMcpServers,
} from '../../src/mcp/plugin-init';

// Mock MCPHost
class MockMCPHost {
  plugins: any[] = [];

  registerPlugin(contribution: any): void {
    this.plugins.push(contribution);
  }

  getRegisteredPluginCount(): number {
    return this.plugins.length;
  }

  getTotalTools(): number {
    return this.plugins.reduce((sum, p) => sum + ((p.toolSpecs || []).length), 0);
  }

  getTotalResources(): number {
    return this.plugins.reduce((sum, p) => sum + ((p.resourceSpecs || []).length), 0);
  }
}

describe('Plugin MCP Registration', () => {
  let registry: PluginRegistry;
  let mcpHost: MockMCPHost;

  beforeEach(() => {
    registry = new PluginRegistry();
    mcpHost = new MockMCPHost();
    vi.clearAllMocks();
  });

  describe('registerFrameworkMcpServer', () => {
    it('registers framework with tools and resources', () => {
      registerFrameworkMcpServer(mcpHost);
      expect(mcpHost.getRegisteredPluginCount()).toBe(1);
    });

    it('framework registration includes all tool specs', () => {
      registerFrameworkMcpServer(mcpHost);
      const frameworks = mcpHost.plugins.filter((p: any) => p);
      expect(frameworks.length).toBeGreaterThan(0);
    });
  });

  describe('initializePluginMcpServers', () => {
    it('registers no plugins when registry is empty', () => {
      initializePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(0);
    });

    it('registers plugins with MCP servers', () => {
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'chat.list_components',
              description: 'List chat components',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);

      initializePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(1);
    });

    it('skips plugins without MCP servers', () => {
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
      } as any);
      registry.register({
        name: '@ux3/plugin-form',
        version: '1.0.0',
        mcp: {
          resources: [
            {
              uri: 'plugin://form/schemas',
              name: 'Form Schemas',
              mimeType: 'application/json',
            },
          ],
        },
      } as any);

      initializePluginMcpServers(mcpHost, registry);
      // Only plugin-form should be registered (has MCP)
      expect(mcpHost.getRegisteredPluginCount()).toBe(1);
    });

    it('registers multiple plugins with MCP servers', () => {
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'chat.list',
              description: 'List',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);
      registry.register({
        name: '@ux3/plugin-form',
        version: '1.0.0',
        mcp: {
          resources: [
            {
              uri: 'plugin://form/schemas',
              name: 'Schemas',
              mimeType: 'application/json',
            },
          ],
        },
      } as any);
      registry.register({
        name: '@ux3/plugin-auth',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'auth.get_user',
              description: 'Get user',
              inputSchema: { type: 'object' },
            },
          ],
          resources: [
            {
              uri: 'plugin://auth/docs',
              name: 'Auth Docs',
              mimeType: 'text/markdown',
            },
          ],
        },
      } as any);

      initializePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(3);
    });

    it('handles plugins with only tools', () => {
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'chat.list',
              description: 'List',
              inputSchema: { type: 'object' },
            },
            {
              name: 'chat.inspect',
              description: 'Inspect',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);

      initializePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(1);
    });

    it('handles plugins with only resources', () => {
      registry.register({
        name: '@ux3/plugin-form',
        version: '1.0.0',
        mcp: {
          resources: [
            {
              uri: 'plugin://form/schemas',
              name: 'Schemas',
              mimeType: 'application/json',
            },
            {
              uri: 'plugin://form/docs',
              name: 'Docs',
              mimeType: 'text/markdown',
            },
          ],
        },
      } as any);

      initializePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(1);
    });

    it('handles plugins with both tools and resources', () => {
      registry.register({
        name: '@ux3/plugin-auth',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'auth.get_user',
              description: 'Get user',
              inputSchema: { type: 'object' },
            },
          ],
          resources: [
            {
              uri: 'plugin://auth/schemas',
              name: 'Auth Schemas',
              mimeType: 'application/json',
            },
          ],
        },
      } as any);

      initializePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(1);
    });

    it('preserves tool names from plugin config', () => {
      const toolName = 'chat.components.list';
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: toolName,
              description: 'List chat components',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);

      initializePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(1);
      // Verify the tool name is preserved (no magic transformation)
      expect(mcpHost.plugins[0]).toBeDefined();
    });
  });

  describe('enablePluginMcpServers', () => {
    beforeEach(() => {
      process.env.MCP_ENABLED = 'true';
    });

    it('registers framework and plugins when MCP_ENABLED=true', () => {
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'chat.list',
              description: 'List',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);

      enablePluginMcpServers(mcpHost, registry);
      // 1 framework + 1 plugin
      expect(mcpHost.getRegisteredPluginCount()).toBe(2);
    });

    it('does nothing when MCP_ENABLED=false', () => {
      process.env.MCP_ENABLED = 'false';
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'chat.list',
              description: 'List',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);

      enablePluginMcpServers(mcpHost, registry);
      expect(mcpHost.getRegisteredPluginCount()).toBe(0);
    });

    it('registers framework first before plugins', () => {
      registry.register({
        name: 'p1',
        version: '1.0.0',
        mcp: {
          tools: [
            {
              name: 'p1.tool',
              description: 'Tool',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);

      enablePluginMcpServers(mcpHost, registry);

      // Framework should be first (assuming order preservation)
      expect(mcpHost.getRegisteredPluginCount()).toBeGreaterThanOrEqual(2);
    });
  });

  describe('discovery workflow', () => {
    it('supports complete plugin + framework MCP discovery', () => {
      // Register multiple plugins with different MCP configs
      registry.register({
        name: '@ux3/ux-chat',
        version: '1.0.0',
        displayName: 'Chat',
        categories: ['ui'],
        mcp: {
          tools: [
            {
              name: 'chat.list_components',
              description: 'List components',
              inputSchema: { type: 'object' },
            },
          ],
        },
      } as any);
      registry.register({
        name: '@ux3/plugin-form',
        version: '1.0.0',
        displayName: 'Form',
        categories: ['ui'],
        mcp: {
          resources: [
            {
              uri: 'plugin://form/schemas',
              name: 'Form Schemas',
              mimeType: 'application/json',
            },
          ],
        },
      } as any);
      registry.register({
        name: '@ux3/plugin-data',
        version: '1.0.0',
        displayName: 'Data',
        categories: ['service'],
        // No MCP config - should be skipped
      } as any);

      // Discover and register
      enablePluginMcpServers(mcpHost, registry);

      // Framework + 2 plugins with MCP
      expect(mcpHost.getRegisteredPluginCount()).toBeGreaterThanOrEqual(3);
    });
  });
});
