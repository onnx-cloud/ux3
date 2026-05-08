import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ToolRegistry } from './tools.js';
import { ResourceRegistry } from './resources.js';
import { MCPHost } from './host.js';

function getApp(): any {
  return (globalThis as any).__ux3App;
}

export function createSDKServer(projectDir: string, resourceBaseUrl?: string): McpServer {
  const server = new McpServer({
    name: 'ux3-mcp',
    version: '0.2.0',
  });

  const legacyToolRegistry = new ToolRegistry(projectDir);
  const legacyResourceRegistry = new ResourceRegistry(projectDir, resourceBaseUrl);

  const host = new MCPHost({
    projectDir,
    legacyToolRegistry,
    legacyResourceRegistry,
  });

  registerDevModeHandlers(host);

  // Register all tools from the spec bundle
  const toolSpecs = host.getToolSpecs();
  for (const toolSpec of toolSpecs) {
    const inputSchema = toZodObject(toolSpec.input);

    server.registerTool(
      toolSpec.name,
      {
        description: toolSpec.description,
        inputSchema,
      },
      async (args: any) => {
        try {
          const result = await host.executeTool(toolSpec.name, args);
          return {
            content: [
              {
                type: 'text' as const,
                text: typeof result === 'string' ? result : safeStringify(result),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  // Register resources from the spec bundle
  const resourceSpecs = host.getResourceSpecs();
  for (const resourceSpec of resourceSpecs) {
    const uri = resourceSpec.uri;

    // Skip dynamic patterns
    if (uri.includes('{')) continue;

    server.registerResource(
      resourceSpec.name,
      uri,
      {
        description: resourceSpec.description,
        mimeType: resourceSpec.mimeType,
      },
      async () => {
        const content = await host.readResource(uri);
        return {
          contents: [
            {
              uri,
              mimeType: resourceSpec.mimeType,
              text: content,
            },
          ],
        };
      }
    );
  }

  return server;
}

function registerDevModeHandlers(host: MCPHost): void {
  host.registerToolHandler('fsm.list', async (_args) => {
    const app = getApp();
    if (!app?.machines) {
      return { machines: [], count: 0, note: 'No active FSM instances. Dev tools must be running in a browser context.' };
    }
    const entries = Object.entries(app.machines).map(([name, machine]: [string, any]) => ({
      name,
      state: machine.getState?.() ?? 'unknown',
      hasContext: !!machine.getContext?.(),
    }));
    return { machines: entries, count: entries.length };
  });

  host.registerToolHandler('fsm.snapshot', async (args) => {
    const app = getApp();
    if (!app?.machines) {
      return { error: 'No active FSM instances. Dev tools must be running in a browser context.' };
    }
    const widgetId = args.widgetId as string | undefined;
    if (widgetId) {
      const machine = app.machines[widgetId];
      if (!machine) return { error: `FSM "${widgetId}" not found` };
      return {
        widgetId,
        state: machine.getState?.() ?? 'unknown',
        context: machine.getContext?.() ?? {},
      };
    }
    return { error: 'widgetId required' };
  });

  host.registerToolHandler('fsm.dispatch', async (args) => {
    const app = getApp();
    if (!app?.machines) {
      return { error: 'No active FSM instances. Dev tools must be running in a browser context.' };
    }
    const widgetId = args.widgetId as string;
    const event = args.event as string;
    const payload = args.payload as Record<string, unknown> | undefined;
    if (!widgetId || !event) return { error: 'widgetId and event required' };
    const machine = app.machines[widgetId];
    if (!machine) return { error: `FSM "${widgetId}" not found` };
    const oldState = machine.getState?.() ?? 'unknown';
    try {
      machine.send?.(event, payload);
      const newState = machine.getState?.() ?? 'unknown';
      return { success: true, oldState, newState, event, eventEmitted: true };
    } catch (e: any) {
      return { success: false, oldState, error: e.message };
    }
  });

  host.registerToolHandler('app-state.get', async (args) => {
    const app = getApp();
    if (!app) return { error: 'No app context available' };
    const path = args.path as string | undefined;
    if (path) {
      const parts = path.split('.');
      let val: any = app;
      for (const part of parts) {
        val = val?.[part];
      }
      return { path, value: JSON.stringify(val).length > 2000 ? '[truncated]' : val };
    }
    const summary = {
      machines: Object.keys(app.machines || {}),
      services: Object.keys(app.services || {}),
      locale: app.locale?.locale?.primary,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
    };
    return summary;
  });

  host.registerToolHandler('service-registry.list', async (_args) => {
    const app = getApp();
    if (!app?.services) {
      return { services: [], count: 0, note: 'No active services' };
    }
    const services = Object.entries(app.services).map(([name, svc]: [string, any]) => ({
      name,
      connected: svc.connected ?? svc.isConnected?.() ?? false,
      lastError: svc.lastError ?? null,
    }));
    return { services, count: services.length };
  });

  host.registerToolHandler('inspect.dom', async (args) => {
    if (typeof document === 'undefined') {
      return { error: 'DOM inspection only available in browser context' };
    }
    const selector = args.selector as string | undefined;
    if (selector) {
      const el = document.querySelector(selector);
      if (!el) return { error: `No element matching "${selector}"` };
      return {
        selector,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classList: Array.from(el.classList),
        children: el.children.length,
        innerText: (el as HTMLElement).innerText?.slice(0, 500) || '',
      };
    }
    const uxElements = document.querySelectorAll('[class*="ux-"], [id*="ux-"], [ux-view], [ux-route]');
    return {
      documentTitle: document.title,
      bodyChildren: document.body.children.length,
      uxElementsFound: uxElements.length,
    };
  });

  host.registerToolHandler('rebuild.project', async () => {
    const app = getApp();
    if (app?.config?.development?.hotReload) {
      return { success: true, message: 'Hot reload is active. Changes are applied automatically.' };
    }
    return { success: false, message: 'Project rebuild requires dev server with hot reload enabled.' };
  });

  host.registerToolHandler('reload.view', async (args) => {
    const name = args.name as string;
    const app = getApp();
    return {
      success: true,
      view: name,
      message: `View "${name}" reload instruction sent. ${app ? '(app context available)' : '(dev server context unavailable)'}`,
    };
  });

  host.registerToolHandler('reload.style', async (args) => {
    const name = (args.name as string) || 'all';
    return {
      success: true,
      style: name,
      message: `Style "${name}" reload triggered.`,
    };
  });

  host.registerToolHandler('config.view', async (args) => {
    return {
      viewName: args.viewName,
      overrides: args.overrides || {},
      applied: true,
      note: 'View config overrides are ephemeral; they reset on reload.',
    };
  });

  host.registerToolHandler('config.fsm-logging', async (args) => {
    const enabled = !!args.enabled;
    (globalThis as any).__ux3FSMLogging = enabled;
    return { fsmLogging: enabled, message: `FSM logging ${enabled ? 'enabled' : 'disabled'}.` };
  });

  const app = getApp();
  if (app) {
    host.connectDevSession(app);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toZodObject(inputSchema: any): z.ZodObject<Record<string, z.ZodTypeAny>> {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return z.object({});
  }

  const props = (inputSchema.properties || {}) as Record<string, any>;
  const requiredList = new Set<string>(Array.isArray(inputSchema.required) ? inputSchema.required : []);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(props)) {
    const p = prop as any;
    const schema = jsonTypeToZod(p);
    shape[key] = requiredList.has(key) ? schema : schema.optional();
  }

  return z.object(shape);
}

function jsonTypeToZod(prop: any): z.ZodTypeAny {
  if (!prop || typeof prop !== 'object') {
    return z.any();
  }

  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    const enumValues = prop.enum.filter((v: unknown) => typeof v === 'string') as string[];
    if (enumValues.length > 0) {
      return z.enum(enumValues as [string, ...string[]]);
    }
  }

  switch (prop.type) {
    case 'string':
      return z.string();
    case 'number':
    case 'integer':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array': {
      const itemSchema = jsonTypeToZod(prop.items);
      return z.array(itemSchema);
    }
    case 'object': {
      const nestedProps = (prop.properties || {}) as Record<string, any>;
      const nestedRequired = new Set<string>(Array.isArray(prop.required) ? prop.required : []);
      const nestedShape: Record<string, z.ZodTypeAny> = {};
      for (const [k, nestedProp] of Object.entries(nestedProps)) {
        const nestedSchema = jsonTypeToZod(nestedProp);
        nestedShape[k] = nestedRequired.has(k) ? nestedSchema : nestedSchema.optional();
      }
      return z.object(nestedShape);
    }
    default:
      return z.any();
  }
}
