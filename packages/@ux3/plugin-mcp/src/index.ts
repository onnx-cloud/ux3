import type { Plugin } from '../../../../src/plugin/registry';
import type { AppContext } from '../../../../src/ui/app';

interface McpServerConfig {
  type?: 'dev' | 'http' | 'command';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

interface McpPluginConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

const MCP_PROXY = '/$/mcp';
const LLM_PROXY = '/$/llm/chat';

function serverUrl(name?: string): string {
  return name ? `${MCP_PROXY}/${name}` : MCP_PROXY;
}

async function mcpCall(method: string, params?: any, server?: string): Promise<any> {
  const url = serverUrl(server);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params: params ?? {}, id: 1 }),
  });
  if (!resp.ok) throw new Error(`MCP ${method}: ${resp.status}`);
  const data = await resp.json();
  if (data?.error) throw new Error(data.error.message || `MCP ${method} error`);
  return data?.result ?? null;
}

function safeStringify(v: unknown): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function normalizeTool(t: any): any {
  let inputSchema = t?.inputSchema ?? null;
  if (!inputSchema && t?.input) {
    inputSchema = { type: t.input.type || 'object', properties: t.input.properties || {}, required: t.input.required || [] };
  }
  if (!inputSchema) inputSchema = { type: 'object', properties: {}, required: [] };
  const props = inputSchema.properties || {};
  const propsList = Object.entries(props).map(([name, p]: [string, any]) => ({
    name, type: p?.type || 'string', description: p?.description || '', enum: p?.enum || null,
  }));
  return { ...t, hasParams: propsList.length > 0, inputSchema: { ...inputSchema, propertiesList: propsList } };
}

class McpService {
  private config: McpPluginConfig;

  constructor(config: McpPluginConfig = {}) {
    this.config = config;
  }

  private getServer(name?: string): string | undefined {
    if (!name || !this.config.mcpServers) return undefined;
    const srv = this.config.mcpServers[name];
    return srv ? name : undefined;
  }

  async loadMCPData(server?: string): Promise<any> {
    const srv = this.getServer(server);
    const results = await Promise.allSettled([
      mcpCall('tools/list', undefined, srv),
      mcpCall('prompts/list', undefined, srv),
      mcpCall('resources/list', undefined, srv),
    ]);
    const tools = results[0].status === 'fulfilled' ? (results[0].value?.tools || []).map(normalizeTool) : [];
    const prompts = results[1].status === 'fulfilled' ? (results[1].value?.prompts || []) : [];
    const resources = results[2].status === 'fulfilled' ? (results[2].value?.resources || []) : [];
    return { tools, prompts, resources, mcpAvailable: results[0].status === 'fulfilled' };
  }

  async getPrompt(name: string, args?: Record<string, unknown>, server?: string): Promise<any> {
    const srv = this.getServer(server);
    const result = await mcpCall('prompts/get', { name, arguments: args }, srv);
    return { messages: result?.messages || [] };
  }

  async executeTool(name: string, args?: Record<string, unknown>, server?: string): Promise<any> {
    const srv = this.getServer(server);
    const result = await mcpCall('tools/call', { name, arguments: args }, srv);
    return { result: safeStringify(result) };
  }

  async sendSample(messages: Array<{ role: string; content: string }>): Promise<string> {
    const resp = await fetch(LLM_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'sampling/createMessage',
        params: { messages, maxTokens: 1024 },
        id: 1,
      }),
    });
    if (!resp.ok) throw new Error(`LLM proxy: ${resp.status}`);
    const data = await resp.json();
    if (data?.error) throw new Error(data.error.message || 'LLM error');
    return data?.result?.content?.text || data?.result?.text || JSON.stringify(data?.result);
  }
}

export const McpPlugin: Plugin = {
  name: '@ux3/plugin-mcp',
  version: '0.1.0',
  description: 'MCP client + dev server proxy with built-in tools/prompts/resources',
  install(app: AppContext) {
    const pluginConfig = (this as any)?.config || (McpPlugin as any)?.config || {};
    const merged: McpPluginConfig = {
      mcpServers: {
        dev: { type: 'dev' },
        ...(pluginConfig.mcpServers || {}),
      },
    };
    const service = new McpService(merged);
    (app as any).registerService?.('mcp', () => service) || (app.services.mcp = service as any);
    (app as any).utils.mcp = service;

    if (typeof window !== 'undefined') {
      (window as any).__ux3McpService = service;
    }
  },
};

export { McpService };
export default McpPlugin;
