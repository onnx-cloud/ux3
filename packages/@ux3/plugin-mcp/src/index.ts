import type { Plugin } from '../../../../src/plugin/registry';
import type { AppContext } from '../../../../src/ui/app';
import { defaultLogger } from '../../../../src/security/observability.js';
import { reactive } from '../../../../src/state/reactive.js';
import type { Reactive } from '../../../../src/state/reactive.js';
import { createLLMClient, type LLMClient, type SamplingRequest, type SamplingResult } from './llm-client.js';

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
  maxIterations?: number;
  contextStrategy?: 'sliding-window' | 'truncate' | 'summarize';
  contextWindow?: number;
  includeContext?: 'allServers' | 'thisServer' | 'none';
  injectResources?: string[];
  historyService?: string;
  beforeToolCall?: (ctx: ToolCallContext) => ToolCallDecision | Promise<ToolCallDecision>;
}

export interface SessionConfig {
  defaultMode?: AgentMode;
  maxQueueLength?: number;
  maxSteeringInterval?: number;
  parallelTools?: number;
}

export type AgentMode = 'chat' | 'blocking' | 'queue' | 'steering';

export type AgentState = 'idle' | 'thinking' | 'tool_calling' | 'error';

export interface AgentTurn {
  role: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'system';
  content: string | Record<string, unknown>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AgentSessionOptions {
  id?: string;
  mode?: AgentMode;
  session?: SessionConfig;
}

export interface AgentSession {
  id: string;
  agentName: string;
  history: Reactive<AgentTurn[]>;
  mode: AgentMode;
  state: Reactive<AgentState>;
  send(message: { role: string; content: string }, signal?: AbortSignal): Promise<AgentTurn>;
  stream(message: { role: string; content: string }, signal?: AbortSignal): AsyncIterable<AgentTurn>;
  cancel(): void;
  setMode(mode: AgentMode): void;
  reset(): void;
  destroy(): void;
}

interface McpPluginConfig {
  mcpServers?: Record<string, McpServerConfig>;
  clients?: Record<string, any>;
  agents?: Record<string, AgentConfig>;
}

const MCP_PROXY = '/$/mcp';
const LLM_PROXY = '/$/llm/chat';

function serverUrl(name?: string): string {
  return name ? `${MCP_PROXY}/${name}` : MCP_PROXY;
}

function clientUrl(clientName?: string): string {
  return clientName ? `${LLM_PROXY}/${clientName}` : LLM_PROXY;
}

async function mcpCall(method: string, params?: any, server?: string, signal?: AbortSignal): Promise<any> {
  const url = serverUrl(server);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params: params ?? {}, id: 1 }),
    signal,
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
  return { ...t, inputSchema };
}

class McpService {
  private config: McpPluginConfig;
  private sessions: Map<string, AgentSession> = new Map();
  private toolCache: Map<string, { tools: any[]; cachedAt: number }> = new Map();
  private toolCacheTTL: number = 60000;
  private llmClients: Map<string, LLMClient> = new Map();
  private toolHandlers: Map<string, (args: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>> = new Map();

  constructor(config: McpPluginConfig = {}) {
    this.config = config;
    for (const [name, clientConfig] of Object.entries(config.clients || {})) {
      this.llmClients.set(name, createLLMClient(clientConfig));
    }
  }

  registerToolHandler(name: string, handler: (args: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>): void {
    this.toolHandlers.set(name, handler);
  }

  private async executeToolWithHandlers(
    toolName: string,
    args: Record<string, unknown>,
    servers: string[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    const localHandler = this.toolHandlers.get(toolName);
    if (localHandler) {
      return localHandler(args, signal);
    }
    return this.executeToolOnServers(toolName, args, servers, signal);
  }

  private getServer(name?: string): string | undefined {
    if (!name || !this.config.mcpServers) return undefined;
    return this.config.mcpServers[name] ? name : undefined;
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

  getAgentConfig(name: string): AgentConfig | undefined {
    return this.config.agents?.[name];
  }

  private async fetchServerTools(servers: string[]): Promise<any[]> {
    const key = servers.join(',');
    const cached = this.toolCache.get(key);
    if (cached && (Date.now() - cached.cachedAt) < this.toolCacheTTL) return cached.tools;

    const allTools: any[] = [];
    for (const serverName of servers) {
      try {
        const result = await mcpCall('tools/list', undefined, serverName);
        allTools.push(...(result?.tools || []).map(normalizeTool));
      } catch { /* skip unavailable server */ }
    }
    const deduped = allTools.filter((t, i, arr) => arr.findIndex((x) => x.name === t.name) === i);
    this.toolCache.set(key, { tools: deduped, cachedAt: Date.now() });
    return deduped;
  }

  invalidateToolCache(server?: string): void {
    if (server) {
      for (const [key] of this.toolCache) {
        if (key.split(',').includes(server)) this.toolCache.delete(key);
      }
    } else {
      this.toolCache.clear();
    }
  }

  private async executeToolOnServers(
    toolName: string,
    args: Record<string, unknown>,
    servers: string[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    for (const serverName of servers) {
      try {
        return await mcpCall('tools/call', { name: toolName, arguments: args }, serverName, signal);
      } catch { continue; }
    }
    throw new Error(`Tool not found on any server: ${toolName}`);
  }

  /**
   * Shared async generator — single agent loop powering both send() and stream().
   * Yields each history turn as it's produced.
   */
  private async *runAgentLoop(
    msg: { role: string; content: string },
    data: { history: AgentTurn[]; state: AgentState },
    config: AgentConfig,
    sessionId: string,
    sessionConfig?: SessionConfig,
    signal?: AbortSignal,
  ): AsyncGenerator<AgentTurn> {
    data.state = 'thinking';
    const user: AgentTurn = { role: 'user', content: msg.content, timestamp: Date.now(), metadata: {} };
    data.history.push(user);
    yield user;

    const msgs = data.history.map((t) => ({
      role: t.role,
      content: typeof t.content === 'string' ? t.content : JSON.stringify(t.content),
    }));
    if (config.systemPrompt) msgs.unshift({ role: 'system', content: config.systemPrompt });

    if (config.injectResources?.length) {
      const resourceTexts: string[] = [];
      for (const uri of config.injectResources) {
        try {
          const txt = await this.readResource(uri, config.servers);
          resourceTexts.push(`[${uri}]\n${txt}`);
        } catch {}
      }
      if (resourceTexts.length) msgs.unshift({ role: 'system', content: resourceTexts.join('\n\n') });
    }

    if (config.contextWindow && config.contextWindow > 0) {
      while (msgs.length > config.contextWindow) {
        if (config.contextStrategy === 'summarize') {
          const overflowCount = msgs.length - config.contextWindow;
          let startIdx = msgs[0]?.role === 'system' ? 1 : 0;
          if (overflowCount > 0 && startIdx < msgs.length) {
            const overflowMsgs = msgs.splice(startIdx, overflowCount);
            try {
              const summaryPrompt = [
                { role: 'system', content: 'Summarize the following conversation in 2-3 paragraphs. Preserve key decisions, facts, and action items.' },
                ...overflowMsgs.map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: 'Provide a concise summary of the above conversation.' },
              ];
              const summaryResult = await this.sendSampleRaw(
                { messages: summaryPrompt, maxTokens: 1024 },
                config.client,
              );
              const summary = summaryResult.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text || '')
                .join('\n');
              if (summary) {
                msgs.splice(startIdx, 0, {
                  role: 'system',
                  content: `[Previous conversation summary]: ${summary}`,
                });
              }
            } catch {
              break;
            }
          } else {
            break;
          }
        }
        if (msgs[0].role === 'system') msgs.splice(1, 2);
        else msgs.splice(0, 2);
      }
    }

    try {
      const tools = await this.fetchServerTools(config.servers);
      const clientConfig = this.config.clients?.[config.client];
      const maxTokens = clientConfig?.maxTokens ?? 4096;
      const maxIterations = config.maxIterations ?? 10;
      const parallel = sessionConfig?.parallelTools ?? 1;

      for (let i = 0; i < maxIterations; i++) {
        if (signal?.aborted) break;

        data.state = 'thinking';
        const r = await this.sendSampleRaw({ messages: msgs, tools, maxTokens }, config.client, signal);

        const toolUses = r.content.filter((b: any) => b.type === 'tool_use');
        const textBlocks = r.content.filter((b: any) => b.type === 'text');

        for (const b of textBlocks) {
          const at: AgentTurn = { role: 'assistant', content: b.text || '', timestamp: Date.now(), metadata: { iteration: i } };
          data.history.push(at);
          yield at;
        }

        if (toolUses.length === 0 || r.stopReason !== 'tool_use') {
          data.state = 'idle';
          return;
        }

        data.state = 'tool_calling';
        const limit = parallel <= 0 ? 0 : parallel;

        if (limit === 0) {
          for (const b of toolUses) {
            msgs.push(
              { role: 'assistant', content: JSON.stringify(b) },
              { role: 'user', content: JSON.stringify({ skipped: 'parallelTools disabled' }) },
            );
          }
          continue;
        }

        for (let bIdx = 0; bIdx < toolUses.length; bIdx += limit) {
          const batch = toolUses.slice(bIdx, bIdx + limit);

          const ops = batch.map(async (b: any): Promise<{ b: any; result: string; turns: AgentTurn[] }> => {
            const turns: AgentTurn[] = [];

            if (signal?.aborted) return { b, result: '{}', turns };

            let actualServer = config.servers[0];
            if (config.beforeToolCall) {
              for (const srv of config.servers) {
                try {
                  const srvTools = await this.fetchServerTools([srv]);
                  if (srvTools.some((t) => t.name === b.name)) {
                    actualServer = srv;
                    break;
                  }
                } catch {}
              }

              const decision = await config.beforeToolCall({
                tool: b.name!,
                server: actualServer,
                args: (b.input || {}) as Record<string, unknown>,
                sessionId,
              });
              if (!decision.allow) {
                return {
                  b,
                  result: JSON.stringify({ blocked: true, reason: (decision as any).reason || 'blocked by policy' }),
                  turns,
                };
              }
              if (decision.args) b.input = decision.args;
            }

            const tc: AgentTurn = {
              role: 'tool_call',
              content: { name: b.name, args: b.input, id: b.id },
              timestamp: Date.now(),
              metadata: { iteration: i, server: actualServer },
            };
            data.history.push(tc);
            turns.push(tc);

            try {
              const tr = await this.executeToolWithHandlers(b.name!, b.input || {}, config.servers, signal);
              const resultContent = typeof tr === 'string' ? tr : JSON.stringify(tr);
              const rt: AgentTurn = {
                role: 'tool_result',
                content: resultContent,
                timestamp: Date.now(),
                metadata: { toolName: b.name, toolCallId: b.id, server: actualServer },
              };
              data.history.push(rt);
              turns.push(rt);
              return { b, result: resultContent, turns };
            } catch (err: any) {
              const errMsg = err instanceof Error ? err.message : String(err);
              const rt: AgentTurn = {
                role: 'tool_result',
                content: JSON.stringify({ error: errMsg, toolName: b.name }),
                timestamp: Date.now(),
                metadata: { toolName: b.name, error: true, server: actualServer },
              };
              data.history.push(rt);
              turns.push(rt);
              return { b, result: JSON.stringify({ error: errMsg, toolName: b.name }), turns };
            }
          });

          for (const op of ops) {
            const { b, result, turns } = await op;
            for (const turn of turns) yield turn;
            msgs.push({ role: 'assistant', content: JSON.stringify(b) }, { role: 'user', content: result });
          }
        }
      }

      data.state = 'idle';
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError' || e?.code === 'aborted' || e?.message?.includes('aborted');
      if (isAbort) {
        data.state = 'idle';
        const ct: AgentTurn = {
          role: 'system',
          content: 'Request cancelled.',
          timestamp: Date.now(),
          metadata: { reason: 'cancelled' },
        };
        data.history.push(ct);
        yield ct;
        return;
      }

      data.state = 'error';
      const et: AgentTurn = {
        role: 'system',
        content: `Agent error: ${e instanceof Error ? e.message : String(e)}`,
        timestamp: Date.now(),
        metadata: { error: true, errorCode: e?.code || 'unknown' },
      };
      data.history.push(et);
      yield et;
      defaultLogger.error('@ux3/plugin-mcp.agent.error', e, { session: sessionId });
      throw e;
    }
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
    const maxIterations = config.maxIterations ?? 10;
    const maxQueue = options.session?.maxQueueLength ?? 50;
    const steeringThrottle = options.session?.maxSteeringInterval ?? 500;
    let lastSteerAt = 0;
    const srv = this;

    const data = reactive({ history: [] as AgentTurn[], state: 'idle' as AgentState });
    let mode: AgentMode = options.mode || options.session?.defaultMode || 'chat';
    let processing = false;
    let activeAbort: AbortController | null = null;
    const pending: Array<{ msg: { role: string; content: string }; sig?: AbortSignal; res: (t: AgentTurn) => void; rej: (e: unknown) => void }> = [];

    const flush = (): void => {
      if (processing || pending.length === 0) return;
      const next = pending.shift()!;
      processing = true;
      (async () => {
        try {
          activeAbort = next.sig ? null : new AbortController();
          const effSig = next.sig || activeAbort?.signal;
          let last: AgentTurn | undefined;
          for await (const turn of srv.runAgentLoop(next.msg, data, config, sessionId, options.session, effSig)) {
            last = turn;
          }
          next.res(last!);
        } catch (e) {
          next.rej(e);
        } finally {
          processing = false; flush();
        }
      })();
    };

    const local: AgentSession = {
      id: sessionId, agentName,
      get history() { return data.history; },
      get mode() { return mode; },
      get state() { return data.state; },

      send: async (msg, sig) => {
        if (data.state === 'error') data.state = 'idle';
        if (data.state !== 'idle') {
          if (mode === 'blocking') throw new Error('Session is busy');
          if (mode === 'steering') {
            const now = Date.now();
            if (now - lastSteerAt < steeringThrottle) throw new Error('Steering throttled');
            lastSteerAt = now;
            activeAbort?.abort(); activeAbort = null;
            processing = false; pending.length = 0;
          } else {
            if (pending.length >= maxQueue) throw new Error('Queue full');
            return new Promise<AgentTurn>((res, rej) => { pending.push({ msg, sig, res, rej }); flush(); });
          }
        }
        processing = true;
        activeAbort = sig ? null : new AbortController();
        const effSig = sig || activeAbort?.signal;
        try {
          let last: AgentTurn | undefined;
          for await (const turn of srv.runAgentLoop(msg, data, config, sessionId, effSig)) {
            last = turn;
          }
          return last!;
        } finally {
          processing = false; flush();
        }
      },

      stream: async function* (msg, sig) {
        if (data.state === 'error') data.state = 'idle';
        if (data.state !== 'idle') {
          if (mode === 'blocking') throw new Error('Session is busy');
          if (mode === 'steering') {
            const now = Date.now();
            if (now - lastSteerAt < steeringThrottle) throw new Error('Steering throttled');
            lastSteerAt = now;
            activeAbort?.abort(); activeAbort = null;
            processing = false; pending.length = 0;
          } else {
            yield await local.send(msg, sig); return;
          }
        }
        processing = true;
        activeAbort = sig ? null : new AbortController();
        const effSig = sig || activeAbort?.signal;
        try {
          yield* srv.runAgentLoop(msg, data, config, sessionId, effSig);
        } finally {
          processing = false; flush();
        }
      },

      cancel: () => { activeAbort?.abort(); activeAbort = null; processing = false; pending.length = 0; data.state = 'idle'; },
      setMode: (m) => { mode = m; defaultLogger.info('@ux3/plugin-mcp.session.setMode', { agent: agentName, session: sessionId, mode: m }); },
      reset: () => { activeAbort?.abort(); activeAbort = null; data.history.length = 0; data.state = 'idle'; pending.length = 0; processing = false; defaultLogger.info('@ux3/plugin-mcp.session.reset', { agent: agentName, session: sessionId }); },
      destroy: () => { activeAbort?.abort(); activeAbort = null; pending.length = 0; processing = false; srv.sessions.delete(sessionId); defaultLogger.info('@ux3/plugin-mcp.session.destroy', { agent: agentName, session: sessionId }); },
    };

    srv.sessions.set(sessionId, local);
    defaultLogger.info('@ux3/plugin-mcp.session.create', { agent: agentName, session: sessionId, mode: mode });
    return local;
  }

  getSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  destroySession(id: string): void {
    const s = this.sessions.get(id);
    if (s) { s.destroy(); this.sessions.delete(id); }
  }

  async loadMCPData(server?: string): Promise<any> {
    const srv = this.getServer(server);
    const results = await Promise.allSettled([
      mcpCall('tools/list', undefined, srv),
      mcpCall('prompts/list', undefined, srv),
      mcpCall('resources/list', undefined, srv),
    ]);
    return {
      tools: results[0].status === 'fulfilled' ? (results[0].value?.tools || []).map(normalizeTool) : [],
      prompts: results[1].status === 'fulfilled' ? (results[1].value?.prompts || []) : [],
      resources: results[2].status === 'fulfilled' ? (results[2].value?.resources || []) : [],
      mcpAvailable: results[0].status === 'fulfilled',
    };
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

  async readResource(uri: string, servers?: string[]): Promise<string> {
    for (const serverName of (servers || this.listServers())) {
      try {
        const result = await mcpCall('resources/read', { uri }, serverName);
        if (result) return typeof result === 'string' ? result : safeStringify(result);
      } catch { continue; }
    }
    throw new Error(`Resource not found on any server: ${uri}`);
  }

  async sendSampleRaw(req: SamplingRequest, clientName?: string, signal?: AbortSignal): Promise<SamplingResult> {
    const client = clientName ? this.llmClients.get(clientName) : this.llmClients.values().next().value;
    if (!client) {
      throw new Error(`LLM client not configured: ${clientName || 'default'}`);
    }
    return client.call(req, signal);
  }

  async sendSample(messages: Array<{ role: string; content: string }>, agentName?: string): Promise<string> {
    const clientName = agentName ? this.config.agents?.[agentName]?.client : undefined;
    const clientConfig = clientName ? this.config.clients?.[clientName] : undefined;
    const maxTokens = clientConfig?.maxTokens || 1024;
    const result = await this.sendSampleRaw({ messages, maxTokens }, clientName);
    return result.content.map((c) => c.text || '').join('\n');
  }

  private generateId(): string {
    return crypto.randomUUID?.() ?? `session-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export interface SessionUIState {
  queueLength: number;
  showQueueBadge: boolean;
  showSteeringIndicator: boolean;
  showStopButton: boolean;
  composerDisabled: boolean;
  composerPlaceholder: string;
  statusText: string;
  statusState: AgentState;
}

export class SessionManager {
  session: AgentSession;
  private onStateChange?: (ui: SessionUIState) => void;
  private listeners: Array<(ui: SessionUIState) => void> = [];

  constructor(session: AgentSession) {
    this.session = session;
  }

  onChange(fn: (ui: SessionUIState) => void): void {
    this.listeners.push(fn);
  }

  private emit(ui: SessionUIState): void {
    for (const fn of this.listeners) fn(ui);
  }

  getUIState(): SessionUIState {
    const s = this.session;
    const busy = s.state !== 'idle';
    return {
      queueLength: 0,
      showQueueBadge: busy && s.mode === 'queue',
      showSteeringIndicator: s.mode === 'steering',
      showStopButton: busy,
      composerDisabled: s.mode === 'blocking' && busy,
      composerPlaceholder: busy
        ? s.mode === 'blocking' ? 'Agent is busy...'
        : s.mode === 'queue' ? 'Message queued...'
        : s.mode === 'steering' ? 'Steer the agent...'
        : 'Type a message...'
        : 'Type a message...',
      statusText: s.state === 'thinking' ? 'Thinking...'
        : s.state === 'tool_calling' ? 'Calling tools...'
        : s.state === 'error' ? 'Error'
        : 'Ready',
      statusState: s.state,
    };
  }

  async send(text: string, signal?: AbortSignal): Promise<AgentTurn> {
    const ui = this.getUIState();
    this.emit(ui);
    const result = await this.session.send({ role: 'user', content: text }, signal);
    this.emit(this.getUIState());
    return result;
  }

  cancel(): void {
    this.session.cancel();
    this.emit(this.getUIState());
  }
}

export const McpPlugin: Plugin = {
  name: '@ux3/plugin-mcp',
  version: '0.2.0',
  description: 'MCP client + dev server proxy with multi-agent, tool-use loop, streaming, and session management',
  install(app: AppContext) {
    const pluginConfig = (this as any)?.config || (McpPlugin as any)?.config || {};
    const merged: McpPluginConfig = {
      mcpServers: { dev: { type: 'dev' }, ...(pluginConfig.mcpServers || {}) },
      clients: { ...(pluginConfig.clients || {}) },
      agents: { ...(pluginConfig.agents || {}) },
    };
    const service = new McpService(merged);
    (app as any).registerService?.('mcp', () => service) || (app.services.mcp = service as any);
    (app as any).utils.mcp = service;
    if (typeof window !== 'undefined') (window as any).__ux3McpService = service;
  },
};

export { McpService };
export default McpPlugin;
