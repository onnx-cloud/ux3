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

interface ToolCallContext {
  tool: string;
  server: string;
  args: Record<string, unknown>;
  sessionId: string;
}

type ToolCallDecision =
  | { allow: true; args?: Record<string, unknown> }
  | { allow: false; reason?: string };

export interface AgentConfig {
  client: string;
  servers: string[];
  systemPrompt?: string;
  defaultMode?: AgentMode;
  maxIterations?: number;
  parallelTools?: number;
  contextStrategy?: 'sliding-window' | 'truncate' | 'summarize';
  contextWindow?: number;
  includeContext?: 'allServers' | 'thisServer' | 'none';
  injectResources?: string[];
  historyService?: string;
  beforeToolCall?: (ctx: ToolCallContext) => ToolCallDecision | Promise<ToolCallDecision>;
}

export type AgentMode = 'chat' | 'blocking' | 'queue' | 'steering';

export interface AgentTurn {
  role: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'system';
  content: string | Record<string, unknown>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AgentSessionOptions {
  id?: string;
  mode?: AgentMode;
}

export interface AgentSession {
  readonly id: string;
  readonly agentName: string;
  readonly history: AgentTurn[];
  mode: AgentMode;
  state: 'idle' | 'thinking' | 'tool_calling' | 'error';
  send(message: { role: string; content: string }, signal?: AbortSignal): Promise<AgentTurn>;
  stream?(message: { role: string; content: string }, signal?: AbortSignal): AsyncIterable<AgentTurn>;
  setMode(mode: AgentMode): void;
  reset(): void;
  destroy(): void;
}

interface McpPluginConfig {
  mcpServers?: Record<string, McpServerConfig>;
  clients?: Record<string, unknown>;
  agents?: Record<string, AgentConfig>;
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
  private sessions: Map<string, AgentSession> = new Map();

  constructor(config: McpPluginConfig = {}) {
    this.config = config;
  }

  private getServer(name?: string): string | undefined {
    if (!name || !this.config.mcpServers) return undefined;
    const srv = this.config.mcpServers[name];
    return srv ? name : undefined;
  }

  listServers(): string[] {
    return this.config.mcpServers ? Object.keys(this.config.mcpServers) : [];
  }

  listAgents(): string[] {
    return this.config.agents ? Object.keys(this.config.agents) : [];
  }

  listClients(): string[] {
    return this.config.clients ? Object.keys(this.config.clients) : [];
  }

  createSession(agentName: string, id?: string): AgentSession;
  createSession(agentName: string, options?: AgentSessionOptions): AgentSession;
  createSession(agentName: string, arg?: string | AgentSessionOptions): AgentSession {
    if (!this.config.agents?.[agentName]) {
      throw new Error(`Unknown agent: ${agentName}`);
    }
    const options: AgentSessionOptions = typeof arg === 'string' ? { id: arg } : arg || {};
    const config = this.config.agents[agentName];
    const sessionId = options.id || this.generateId();
    let processing = false;
    const pendingRequests: Array<{
      message: { role: string; content: string };
      signal?: AbortSignal;
      resolve: (turn: AgentTurn) => void;
      reject: (reason: unknown) => void;
    }> = [];

    const processQueue = async (): Promise<void> => {
      if (processing || pendingRequests.length === 0) return;
      const next = pendingRequests.shift()!;
      try {
        const turn = await doSend(next.message, next.signal);
        next.resolve(turn);
      } catch (error) {
        next.reject(error);
      } finally {
        processing = false;
        if (pendingRequests.length > 0) {
          processQueue();
        }
      }
    };

    const doSend = async (message: { role: string; content: string }, signal?: AbortSignal): Promise<AgentTurn> => {
      session.state = 'thinking';
      const userTurn: AgentTurn = {
        role: 'user',
        content: message.content,
        timestamp: Date.now(),
        metadata: { source: 'session' },
      };
      session.history.push(userTurn);

      const promptMessages = session.history.map((turn) => ({ role: turn.role, content: String(turn.content) }));
      if (config.systemPrompt) {
        promptMessages.unshift({ role: 'system', content: config.systemPrompt });
      }

      try {
        const assistantText = await this.sendSample(promptMessages, agentName);
        const assistantTurn: AgentTurn = {
          role: 'assistant',
          content: assistantText,
          timestamp: Date.now(),
          metadata: { source: 'session' },
        };
        session.history.push(assistantTurn);
        session.state = 'idle';
        return assistantTurn;
      } catch (error) {
        session.state = 'error';
        throw error;
      }
    };

    const session: AgentSession = {
      id: sessionId,
      agentName,
      history: [],
      mode: options.mode || config.defaultMode || 'chat',
      state: 'idle',
      send: async (message, signal?: AbortSignal): Promise<AgentTurn> => {
        if (session.state === 'error') {
          session.state = 'idle';
        }
        if (session.state !== 'idle') {
          if (session.mode === 'blocking') {
            throw new Error('Session is busy');
          }
          return new Promise<AgentTurn>((resolve, reject) => {
            pendingRequests.push({ message, signal, resolve, reject });
            processQueue();
          });
        }
        processing = true;
        try {
          const result = await doSend(message, signal);
          return result;
        } finally {
          processing = false;
          if (pendingRequests.length > 0) {
            processQueue();
          }
        }
      },
      stream: async function* (message, signal?: AbortSignal): AsyncIterable<AgentTurn> {
        const assistantTurn = await session.send(message, signal);
        yield assistantTurn;
      },
      setMode: (mode: AgentMode): void => {
        session.mode = mode;
      },
      reset: (): void => {
        session.history.length = 0;
        session.state = 'idle';
        pendingRequests.length = 0;
      },
      destroy: (): void => {
        pendingRequests.length = 0;
        this.sessions.delete(sessionId);
      },
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  destroySession(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.destroy();
      this.sessions.delete(id);
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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

  async sendSample(messages: Array<{ role: string; content: string }>, agentName?: string): Promise<string> {
    const params: any = { messages, maxTokens: 1024 };
    if (agentName) params.agent = agentName;
    const resp = await fetch(LLM_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'sampling/createMessage',
        params,
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
      clients: {
        ...(pluginConfig.clients || {}),
      },
      agents: {
        ...(pluginConfig.agents || {}),
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
