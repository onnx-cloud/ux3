/**
 * Plugin MCP Registration
 * 
 * Auto-discovers and registers all plugin MCP servers with the MCP host.
 * No hardcoding: iterates through plugin registry, extracts MCP config from each plugin,
 * and registers via generic mechanism.
 */

import type { MCPHost, MCPPluginContribution } from './host.js';
import type { PluginRegistry } from '../plugin/registry.js';
import { callFrameworkTool, readFrameworkResource, Ux3Tools, Ux3Resources, ux3ToolHandlers, ux3ResourceHandlers } from './framework-tools.js';
import { defaultLogger } from '../security/observability.js';

/**
 * Register a single plugin's MCP server with the MCP host.
 * 
 * @param mcpHost The MCP host to register with
 * @param plugin The plugin (must have mcp config)
 */
function registerPluginMcpServer(
  mcpHost: MCPHost,
  pluginName: string,
  toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>,
  resourceHandlers: Record<string, () => Promise<string>>,
  toolSpecs: any[],
  resourceSpecs: any[]
): void {
  const contribution: MCPPluginContribution = {
    tools: toolSpecs.length > 0 ? toolSpecs : undefined,
    resources: resourceSpecs.length > 0 ? resourceSpecs : undefined,
    toolHandlers: Object.keys(toolHandlers).length > 0 ? toolHandlers : undefined,
    resourceHandlers: Object.keys(resourceHandlers).length > 0 ? resourceHandlers : undefined,
  };

  mcpHost.registerPlugin(contribution);

  defaultLogger.debug(`mcp.plugin.registered`, {
    name: pluginName,
    tools: toolSpecs.length,
    resources: resourceSpecs.length,
  });
}

/**
 * Register the framework itself as an MCP server.
 * 
 * @param mcpHost The MCP host to register with
 */
export function registerFrameworkMcpServer(mcpHost: MCPHost): void {
  // Convert framework tools to ToolSpec format (MCP SDK native)
  const toolSpecs = Object.entries(Ux3Tools).map(([key, name]) => ({
    name,
    description: `Framework tool: ${key}`,
    input: { type: 'object' },
  }));

  // Convert framework resources to ResourceSpec format (MCP SDK native)
  const resourceSpecs = Object.entries(Ux3Resources).map(([key, uri]) => ({
    name: key,
    uri,
    description: `Framework resource: ${key}`,
    mimeType: uri.includes('schema') ? 'application/json' : 'text/markdown',
  }));

  registerPluginMcpServer(
    mcpHost,
    'ux3-framework',
    ux3ToolHandlers as any,
    ux3ResourceHandlers as any,
    toolSpecs,
    resourceSpecs
  );

  defaultLogger.info(`mcp.framework.registered`, {
    name: 'ux3-framework',
    tools: toolSpecs.length,
    resources: resourceSpecs.length,
  });
}

/**
 * Auto-discover and register all plugin MCP servers.
 * 
 * Iterates through pluginRegistry, extracts each plugin's MCP config,
 * and registers it with the MCP host. No hardcoding: all discovery is config-driven.
 * 
 * @param mcpHost The MCP host
 * @param pluginRegistry The plugin registry
 */
export function initializePluginMcpServers(
  mcpHost: MCPHost,
  pluginRegistry: PluginRegistry
): void {
  const servers = pluginRegistry.listMcpServers();

  for (const { plugin, mcp } of servers) {
    // Convert MCP tools (native Tool types) to ToolSpec format
    const toolSpecs = (mcp.tools || []).map((tool: any) => ({
      name: tool.name,
      description: tool.description || `Plugin tool: ${tool.name}`,
      input: tool.inputSchema || { type: 'object' },
    }));

    // Convert MCP resources (native Resource types) to ResourceSpec format
    const resourceSpecs = (mcp.resources || []).map((resource: any) => ({
      name: resource.name,
      uri: resource.uri,
      description: resource.description || `Plugin resource: ${resource.name}`,
      mimeType: resource.mimeType || 'text/plain',
    }));

    // TODO: Plugin authors implement callTool() and readResource() methods
    // For now, we register specs but handlers must be wired separately
    // This is where plugin.callTool() and plugin.readResource() would be called

    const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {};
    const resourceHandlers: Record<string, () => Promise<string>> = {};

    // If plugin implements MCP methods, wire them up
    if (typeof (plugin as any).callTool === 'function') {
      for (const spec of toolSpecs) {
        toolHandlers[spec.name] = async (args: Record<string, unknown>) => {
          return (plugin as any).callTool(spec.name, args);
        };
      }
    }

    if (typeof (plugin as any).readResource === 'function') {
      for (const spec of resourceSpecs) {
        resourceHandlers[spec.uri] = async () => {
          return (plugin as any).readResource(spec.uri);
        };
      }
    }

    registerPluginMcpServer(
      mcpHost,
      plugin.name,
      toolHandlers,
      resourceHandlers,
      toolSpecs,
      resourceSpecs
    );
  }

  defaultLogger.info(`mcp.plugins.initialized`, {
    count: servers.length,
  });
}

/**
 * Enable MCP for all plugins + framework.
 * Call this during dev-server initialization if MCP_ENABLED !== 'false'.
 * 
 * @param mcpHost The MCP host
 * @param pluginRegistry The plugin registry
 */
export function enablePluginMcpServers(
  mcpHost: MCPHost,
  pluginRegistry: PluginRegistry
): void {
  const enabled = (process.env.MCP_ENABLED || 'true').toLowerCase() !== 'false';

  if (!enabled) {
    defaultLogger.debug(`mcp.disabled`, {
      reason: 'MCP_ENABLED=false',
    });
    return;
  }

  // Register framework first (it's a peer, not a plugin)
  registerFrameworkMcpServer(mcpHost);

  // Register all plugins
  initializePluginMcpServers(mcpHost, pluginRegistry);

  defaultLogger.info(`mcp.enabled`, {
    timestamp: new Date().toISOString(),
  });
}
