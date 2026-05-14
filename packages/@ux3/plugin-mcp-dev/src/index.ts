import type { Plugin } from '../../../../src/plugin/registry.js';
import type { AppContext } from '../../../../src/ui/app.js';

const PLUGIN_NAME = '@ux3/plugin-mcp-dev';
const PLUGIN_VERSION = '0.1.0';

let serviceSingleton: DevMcpService | null = null;

interface DevMcpService {
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  readResource(uri: string): Promise<string>;
}

async function getService(app?: AppContext): Promise<DevMcpService> {
  if (serviceSingleton) return serviceSingleton;
  const module = await import('./service.js');
  serviceSingleton = module.createDevMcpService(app);
  return serviceSingleton;
}

export const McpDevPlugin: Plugin = {
  name: PLUGIN_NAME,
  version: PLUGIN_VERSION,
  displayName: 'MCP Dev',
  description: 'Developer MCP tooling for UX3, exposing build-time project inspection and developer workflows over MCP.',
  categories: ['utility', 'developer'],
  async install(app) {
    const service = await getService(app);
    app.utils = app.utils || {};
    (app.utils as any).mcpDev = service;
    app.registerService?.('mcpDev', () => service);
    if (typeof window !== 'undefined') {
      (window as any).__ux3McpDev = service;
    }
  },
  async callTool(name, args) {
    const service = await getService();
    return service.callTool(name, args ?? {});
  },
  async readResource(uri) {
    const service = await getService();
    return service.readResource(uri);
  },
  mcp: {
    tools: [
      {
        name: 'dev.project.info',
        description: 'Get developer-facing project metadata and build guidance',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'dev.entity.list',
        description: 'List project entities by kind',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'] },
          },
          required: ['kind'],
        },
      },
      {
        name: 'dev.entity.get',
        description: 'Read a project entity by kind and name',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'] },
            name: { type: 'string' },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'dev.entity.search',
        description: 'Search project entities by kind and query',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'] },
            query: { type: 'string' },
          },
          required: ['kind', 'query'],
        },
      },
      {
        name: 'dev.build.run',
        description: 'Inspect build command guidance for this project',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string' },
          },
        },
      },
      {
        name: 'dev.build.typecheck',
        description: 'Get TypeScript typecheck guidance for this project',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'dev.validate.all',
        description: 'Run a full project validation guide',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'dev.test.run',
        description: "Inspect the project's test command",
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string' },
          },
        },
      },
      {
        name: 'dev.plugin.list',
        description: 'List installed plugins from the application config',
        inputSchema: { type: 'object', additionalProperties: false },
      },
    ],
    resources: [
      {
        uri: 'plugin://mcp-dev/docs',
        mimeType: 'text/markdown',
        description: 'Developer MCP plugin documentation',
      },
      {
        uri: 'plugin://mcp-dev/config',
        mimeType: 'application/json',
        description: 'Developer MCP plugin configuration metadata',
      },
    ],
    systemPrompt: 'You are a UX3 developer assistant. Use developer MCP tools to inspect the project, report build diagnostics, and guide rich developer workflows.',
  },
};

export default McpDevPlugin;
