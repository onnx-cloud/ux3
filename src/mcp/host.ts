/**
 * MCPHost — central MCP server orchestrator.
 *
 * Loads tool/resource/prompt specs from YAML, coordinates plugin-supplied handlers,
 * executes tools, and manages the MCP context for the dev session.
 */
import type { ToolRegistry } from './tools.js';
import type { ResourceRegistry } from './resources.js';
import type { ToolSpec, ResourceSpec, PromptSpec, PromptArgumentSpec, MCPSpecBundle, SpecLoadOptions } from './spec-loader.js';
import { loadSpecs } from './spec-loader.js';
import { createMCPContext, recordInvocation, setDevSession, type MCPContext } from './context-manager.js';
import type { AppContext } from '../ui/app.js';

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
export type ResourceHandler = (args: Record<string, unknown>) => Promise<string>;
export type PromptHandler = (args?: Record<string, unknown>) => Promise<string>;

export interface MCPPluginContribution {
  tools?: ToolSpec[];
  resources?: ResourceSpec[];
  prompts?: PromptSpec[];
  toolHandlers?: Record<string, ToolHandler>;
  resourceHandlers?: Record<string, ResourceHandler>;
  promptHandlers?: Record<string, PromptHandler>;
}

export interface MCPHostOptions {
  projectDir: string;
  legacyToolRegistry?: ToolRegistry;
  legacyResourceRegistry?: ResourceRegistry;
  llmProxyEndpoint?: string;
}

export class MCPHost {
  private specBundle: MCPSpecBundle;
  private toolHandlers = new Map<string, ToolHandler>();
  private resourceHandlers = new Map<string, ResourceHandler>();
  private promptHandlers = new Map<string, PromptHandler>();
  public readonly context: MCPContext;
  private toolNames = new Set<string>();
  private resourceUris = new Set<string>();
  private promptNames = new Set<string>();
  private llmProxyEndpoint: string;

  constructor(options: MCPHostOptions) {
    const { projectDir } = options;
    this.context = createMCPContext(projectDir);
    this.llmProxyEndpoint = options.llmProxyEndpoint || '';

    const loadOpts: SpecLoadOptions = { projectDir };
    this.specBundle = loadSpecs(loadOpts);

    // Wire up legacy handlers as the initial handler set
    if (options.legacyToolRegistry) {
      this.wireLegacyTools(options.legacyToolRegistry);
    }
    if (options.legacyResourceRegistry) {
      this.wireLegacyResources(options.legacyResourceRegistry);
    }

    // Populate per-type dedup sets from loaded bundle
    for (const t of this.specBundle.tools) this.toolNames.add(t.name);
    for (const r of this.specBundle.resources) this.resourceUris.add(r.uri);
    for (const p of this.specBundle.prompts) this.promptNames.add(p.name);
  }

  private wireLegacyTools(registry: ToolRegistry): void {
    // Bind all spec-defined tools to the legacy registry
    for (const spec of this.specBundle.tools) {
      this.toolHandlers.set(spec.name, async (args) => {
        return registry.executeTool(spec.name, args);
      });
    }
  }

  private wireLegacyResources(registry: ResourceRegistry): void {
    for (const spec of this.specBundle.resources) {
      this.resourceHandlers.set(spec.uri, async () => {
        return registry.readResource(spec.uri);
      });
    }
  }

  registerPlugin(contribution: MCPPluginContribution): void {
    if (contribution.tools) {
      for (const tool of contribution.tools) {
        if (this.toolNames.has(tool.name)) {
          throw new Error(`Plugin tool name conflict: "${tool.name}"`);
        }
        this.toolNames.add(tool.name);
        this.specBundle.tools.push(tool);
      }
    }

    if (contribution.resources) {
      for (const resource of contribution.resources) {
        if (this.resourceUris.has(resource.uri)) {
          throw new Error(`Plugin resource URI conflict: "${resource.uri}"`);
        }
        this.resourceUris.add(resource.uri);
        this.specBundle.resources.push(resource);
      }
    }

    if (contribution.prompts) {
      for (const prompt of contribution.prompts) {
        if (this.promptNames.has(prompt.name)) {
          throw new Error(`Plugin prompt name conflict: "${prompt.name}"`);
        }
        this.promptNames.add(prompt.name);
        this.specBundle.prompts.push(prompt);
      }
    }

    if (contribution.toolHandlers) {
      for (const [name, handler] of Object.entries(contribution.toolHandlers)) {
        this.toolHandlers.set(name, handler);
      }
    }

    if (contribution.resourceHandlers) {
      for (const [uri, handler] of Object.entries(contribution.resourceHandlers)) {
        this.resourceHandlers.set(uri, handler);
      }
    }
  }

  registerToolHandler(name: string, handler: ToolHandler): void {
    this.toolHandlers.set(name, handler);
  }

  registerResourceHandler(uri: string, handler: ResourceHandler): void {
    this.resourceHandlers.set(uri, handler);
  }

  registerPromptHandler(name: string, handler: PromptHandler): void {
    this.promptHandlers.set(name, handler);
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const spec = this.specBundle.tools.find((t) => t.name === name);
    if (!spec) {
      throw new Error(`Tool not found: ${name}`);
    }

    const handler = this.toolHandlers.get(name);
    if (!handler) {
      throw new Error(`No handler registered for tool: ${name}`);
    }

    const result = await handler(args);
    recordInvocation(this.context, name, args, result);
    return result;
  }

  async readResource(uri: string): Promise<string> {
    const spec = this.specBundle.resources.find((r) => r.uri === uri);
    if (!spec) {
      const viewsMatch = uri.match(/^\/views\/(.+)$/);
      if (viewsMatch && this.resourceHandlers.has('/views/{name}')) {
        const handler = this.resourceHandlers.get('/views/{name}')!;
        return handler({ name: viewsMatch[1] });
      }

      const examplesMatch = uri.match(/^\/examples\/(.+)$/);
      if (examplesMatch && this.resourceHandlers.has('/examples/{name}')) {
        const handler = this.resourceHandlers.get('/examples/{name}')!;
        return handler({ name: examplesMatch[1] });
      }

      throw new Error(`Resource not found: ${uri}`);
    }

    const handler = this.resourceHandlers.get(uri);
    if (!handler) {
      throw new Error(`No handler registered for resource: ${uri}`);
    }

    return handler({});
  }

  async getPrompt(name: string, args?: Record<string, unknown>): Promise<{ messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>; description?: string }> {
    const promptSpec = this.specBundle.prompts.find((p) => p.name === name);
    if (!promptSpec) {
      throw new Error(`Prompt not found: ${name}`);
    }

    if (promptSpec.virtual) {
      return this.getVirtualPrompt(promptSpec, args || {});
    }

    const handler = this.promptHandlers.get(name);
    if (handler) {
      const text = await handler(args);
      return {
        messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
        description: promptSpec.description,
      };
    }

    if (promptSpec.content) {
      const resolved = this.resolveTemplateContent(promptSpec.content, args || {});
      return {
        messages: [{ role: 'user' as const, content: { type: 'text' as const, text: resolved } }],
        description: promptSpec.description,
      };
    }

    throw new Error(`No handler or content defined for prompt: ${name}`);
  }

  private resolveTemplateContent(template: string, args: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return args[key] !== undefined ? String(args[key]) : `{{${key}}}`;
    });
  }

  private async getVirtualPrompt(spec: PromptSpec, args: Record<string, unknown>): Promise<{ messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> }> {
    if (!this.llmProxyEndpoint) {
      throw new Error('LLM proxy not configured. Virtual prompts require an LLM adapter.');
    }

    const messages = [
      {
        role: 'system' as const,
        content: `You are a UX3 development assistant. ${spec.description}`,
      },
      {
        role: 'user' as const,
        content: spec.content || Object.entries(args)
          .map(([k, v]) => `**${k}**: ${v}`)
          .join('\n'),
      },
    ];

    const resp = await fetch(this.llmProxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'sampling/createMessage',
        params: { messages, maxTokens: 2048 },
        id: 1,
      }),
    });

    if (!resp.ok) {
      throw new Error(`LLM proxy error: ${resp.status}`);
    }

    const data = await resp.json() as any;
    if (data?.error) {
      throw new Error(data.error.message || 'LLM error');
    }

    const text = data?.result?.content?.text || '';
    return {
      messages: [{ role: 'assistant' as const, content: { type: 'text' as const, text } }],
    };
  }

  getToolSpecs(): ToolSpec[] {
    return this.specBundle.tools;
  }

  getResourceSpecs(): ResourceSpec[] {
    return this.specBundle.resources;
  }

  getPromptSpecs(): PromptSpec[] {
    return this.specBundle.prompts;
  }

  /** Connect the MCP host to a running dev server session */
  connectDevSession(appContext?: AppContext, devPort?: number): void {
    setDevSession(this.context, {
      devServerRunning: true,
      devPort,
      hotReload: appContext?.config?.development?.hotReload === true,
      mcpEnabled: appContext?.config?.development?.mcp?.enabled !== false,
      lastBuild: Date.now(),
      locale: (appContext?.locale as any)?.primary,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }

  /** Disconnect from dev session */
  disconnectDevSession(): void {
    setDevSession(this.context, null);
  }
}
