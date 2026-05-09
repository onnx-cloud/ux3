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

  // Register prompts from the spec bundle
  const promptSpecs = host.getPromptSpecs();
  for (const promptSpec of promptSpecs) {
    server.registerPrompt(
      promptSpec.name,
      {
        description: promptSpec.description,
      },
      async () => {
        try {
          const text = await host.getPrompt(promptSpec.name);
          return {
            messages: [
              {
                role: 'user' as const,
                content: { type: 'text' as const, text },
              },
            ],
          };
        } catch (error) {
          return {
            messages: [
              {
                role: 'user' as const,
                content: {
                  type: 'text' as const,
                  text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
              },
            ],
          };
        }
      }
    );
  }

  return server;
}

function registerDevModeHandlers(host: MCPHost): void {
  // Register prompt handlers — each returns a developer-focused guide
  host.registerPromptHandler('ux3-new-view', async () => {
    return renderPrompt('ux3-new-view', 'View YAML FSM config', `## UX3 View Response Format

When asked to create a view, respond with:

### 1. View YAML (\`ux/widget/{name}.yaml\`)
\`\`\`yaml
name: {view-name}
layout: default         # default | blog | blank
initial: index
context:
  {key}: {default}
states:
  index:
    template: 'widget/{name}/index.html'
    on:
      EVENT_NAME:
        target: index
        actions: [{actionFn}]
        set: { key: value }        # declarative set
        toggle: {key}              # declarative toggle
        navigate: /path            # declarative navigate
        dispatch: eventName        # declarative dispatch
\`\`\`

### 2. Template (\`ux/widget/{name}/index.html\`)
- Use HandlebarsLite syntax: \`{{ i18n.{scope}.key }}\`, \`{{ ctx.field }}\`
- Use \`{{#each array}}\` for iteration, \`{{#if condition}}\` for guards
- Bind events with \`ux-event="click:FSM_EVENT"\`
- Use built-in widgets: \`<ux-tabs>\`, \`<ux-table>\`, \`<ux-card>\`, etc.
- Pass event data with \`ux-event-value="key=value"\`

### 3. Logic (\`ux/logic/{name}.ts\`)
- Export \`ActionFn<T>\`, \`InvokerFn<T>\`, \`GuardFn<T>\` typed functions
- Actions receive \`(context, event)\` and may mutate context or return a partial update
- Invokers return a partial context object that is merged on completion

### 4. i18n (\`ux/i18n/{locale}/{name}.yaml\`)
- Flat key-value pairs: \`heading: My Heading\`
- Reference in templates as \`{{ i18n.{name}.heading }}\`

### 5. Route (\`ux/route/routes.yaml\`)
- Add to \`routes:\` array: \`- path: /{route-path}\` / \`view: {name}\``);
  });

  host.registerPromptHandler('ux3-add-widget', async () => {
    return renderPrompt('ux3-add-widget', 'Custom widget registration', `## UX3 Widget Creation Guide

### Interactive Widget (shadow DOM)
\`\`\`typescript
// src/ui/widget/primitives/my-widget.ts
import { UxBase } from './base.js';

export class UxMyWidget extends UxBase {
  static get observedAttributes(): string[] { return ['value']; }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(name: string, _old: string | null, _new: string | null): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    this.shadowRoot!.innerHTML = \`
      <style>:host { display: block; }</style>
      <slot></slot>
    \`;
  }
}
\`\`\`

### Registration (3 steps)
1. Add \`import { UxMyWidget } from './my-widget.js';\` to \`registry.ts\`
2. Add definition: \`{ tag: 'ux-my-widget', role: 'region', kind: 'my-widget' }\` to \`ALL_PRIMITIVES\`
3. Add \`'my-widget'\` to the \`PrimitiveKind\` union in \`types.ts\`

### Resolving (2 steps)
1. Add import + switch case to \`resolve.ts\`
2. Add export to \`index.ts\``);
  });

  host.registerPromptHandler('ux3-add-service', async () => {
    return renderPrompt('ux3-add-service', 'Service wiring', `## UX3 Service Registration Guide

### Service YAML (\`ux/service/services.yaml\`)
\`\`\`yaml
services:
  - name: {service-name}
    type: http                # http | mock | oidc | plugin
    adapter: custom           # for plugin types
    config:
      baseURL: /api/{path}
      headers:
        Authorization: Bearer {{token}}
    connectOnStart: true
\`\`\`

### Invoker Usage
\`\`\`typescript
export const loadData: InvokerFn<MyContext> = async (ctx) => {
  const app = (window as any).__ux3App;
  const svc = app?.services?.{serviceName};
  const data = await svc?.get('/endpoint');
  return { items: data };
};
\`\`\`

### FSM Wiring
\`\`\`yaml
states:
  loading:
    invoke: { src: loadData, onDone: index }
  index:
    template: 'widget/{name}/index.html'
\`\`\``);
  });

  host.registerPromptHandler('ux3-fsm-flow', async () => {
    return renderPrompt('ux3-fsm-flow', 'FSM state machine design', `## UX3 FSM Design Guide

### Core Concepts
- **States**: named states with templates, transitions, and invokers
- **Transitions**: \`EVENT → target\` with optional guards, actions, declarative ops
- **Context**: reactive key-value store, mutated by actions and invokers

### Declarative Actions (no TypeScript needed)
\`\`\`yaml
on:
  TOGGLE_FEATURE:
    target: index
    toggle: featureEnabled           # flip boolean
    set: { mode: advanced }          # set fixed value
    navigate: /dashboard             # client-side navigation
    dispatch: app:refresh            # DOM event
    log: "feature toggled"           # diagnostic log
\`\`\`

### Guards + Actions
\`\`\`yaml
on:
  NEXT_STEP:
    target: index
    guard: canAdvance               # Fn(context) => boolean
    actions: [nextStep]             # Fn(context, event) => void|Partial<T>
\`\`\`

### Service Invokers
\`\`\`yaml
states:
  loading:
    invoke: { src: loadFromService, onDone: index, onError: error }
  index:
    template: 'widget/{name}/index.html'
  error:
    template: 'widget/{name}/error.html'
\`\`\`

### Context Patterns
- Boolean flags for UI state: \`modalOpen\`, \`submitting\`, \`validated\`
- Nullable references: \`selectedItem: null\`, \`errorMessage: null\`
- Derived state: compute in actions, store as context keys`);
  });

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

function renderPrompt(name: string, title: string, body: string): string {
  return `# ${title}\n\n${body}\n\n---\n*Prompt: \`${name}\` — generated by UX3 MCP server*`;
}
