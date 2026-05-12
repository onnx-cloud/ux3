# Plugin Authoring Guide

## Overview

UX3 plugins are packages that extend the framework with new components, services, directives, and utilities. Starting with UX3 0.2.0+, plugins also declare **MCP (Model Context Protocol) servers** to enable LLM agents to discover and use plugin capabilities.

## Quick Start

### 1. Create Plugin Structure

```bash
npm run ux3 plugin create --name=my-widget --type=ui

# Generated structure:
# packages/@ux3/plugin-my-widget/
#   ├── package.json
#   ├── plugin.config.yaml          ← NEW: metadata + MCP config
#   ├── src/
#   │   ├── index.ts                ← Plugin definition + MCP handlers
#   │   ├── tools.ts                ← MCP tool/resource constants
#   │   ├── components/
#   │   │   └── MyWidget.ts
#   │   └── handlers/
#   │       ├── tools.ts            ← Tool implementations
#   │       └── resources.ts        ← Resource implementations
#   ├── tests/
#   │   └── index.test.ts
#   └── README.md
```

### 2. Define Plugin Metadata

Edit `package.json`:

```json
{
  "name": "@ux3/plugin-my-widget",
  "version": "1.0.0",
  "description": "My custom widget plugin",
  "author": "Your Name",
  "dependencies": {
    "@ux3/ux3": "^0.2.0"
  }
}
```

Create `plugin.config.yaml`:

```yaml
name: "@ux3/plugin-my-widget"
displayName: "My Widget"
author: "Your Name"
categories:
  - ui
ux3PeerVersion: "^0.2.0"

mcp:
  tools:
    - name: "my-widget.list-components"
      description: "List all available components"
      inputSchema: { type: "object" }
      
    - name: "my-widget.inspect-component"
      description: "Inspect a component's schema"
      inputSchema:
        type: object
        properties:
          componentName: { type: string }
        required: [componentName]

  resources:
    - uri: "plugin://my-widget/schemas"
      mimeType: "application/json"
      description: "Component schemas"
      
    - uri: "plugin://my-widget/docs"
      mimeType: "text/markdown"
      description: "Plugin documentation"

  systemPrompt: "You help build UIs with my-widget components..."
```

### 3. Implement Plugin Definition

Create `src/tools.ts` (define constants, NO magic strings):

```typescript
// Tool names — single source of truth
export const MyWidgetTools = {
  LIST_COMPONENTS: 'my-widget.list-components',
  INSPECT_COMPONENT: 'my-widget.inspect-component',
} as const;

// Resource URIs — single source of truth
export const MyWidgetResources = {
  SCHEMAS: 'plugin://my-widget/schemas',
  DOCS: 'plugin://my-widget/docs',
} as const;

// Tool handlers — registry map (no switch statements)
export const myWidgetToolHandlers = {
  [MyWidgetTools.LIST_COMPONENTS]: async () => ({
    components: ['MyWidget', 'MyInput', 'MyButton'],
  }),

  [MyWidgetTools.INSPECT_COMPONENT]: async (args: { componentName: string }) => ({
    componentName: args.componentName,
    props: { /* component props schema */ },
  }),
} as const satisfies Record<string, (args: any) => Promise<any>>;

// Resource handlers — registry map (no switch statements)
export const myWidgetResourceHandlers = {
  [MyWidgetResources.SCHEMAS]: async () =>
    JSON.stringify({ /* schemas */ }, null, 2),

  [MyWidgetResources.DOCS]: async () =>
    readFileSync('./README.md', 'utf-8'),
} as const satisfies Record<string, () => Promise<string>>;
```

Create `src/index.ts` (plugin registration):

```typescript
import type { Plugin } from '@ux3/ux3';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import { MyWidgetTools, MyWidgetResources, myWidgetToolHandlers, myWidgetResourceHandlers } from './tools.js';
import MyWidgetConfig from './plugin.config.json' assert { type: 'json' };

// Components exported by this plugin
export { MyWidget } from './components/my-widget.js';
export { MyInput } from './components/my-input.js';
export { MyButton } from './components/my-button.js';

// Plugin definition
export const MyWidgetPlugin: Plugin = {
  name: '@ux3/plugin-my-widget',
  version: '1.0.0',
  displayName: 'My Widget',
  description: 'Custom widget components',
  author: 'Your Name',
  categories: ['ui'],
  
  // Components, services, directives, utilities (existing pattern)
  components: {
    MyWidget: () => MyWidget,
    MyInput: () => MyInput,
    MyButton: () => MyButton,
  },

  // MCP Server config (dev-server only)
  mcp: {
    tools: MyWidgetConfig.mcp.tools as Tool[],
    resources: MyWidgetConfig.mcp.resources as Resource[],
    systemPrompt: MyWidgetConfig.mcp.systemPrompt,
  },

  // MCP Tool handler dispatcher
  async callTool(name: string, args: Record<string, unknown>) {
    const handler = myWidgetToolHandlers[name as keyof typeof myWidgetToolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await handler(args);
  },

  // MCP Resource handler dispatcher
  async readResource(uri: string) {
    const handler = myWidgetResourceHandlers[uri as keyof typeof myWidgetResourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    return await handler();
  },
};
```

Build `plugin.config.json` (generated from YAML at build-time):

```json
{
  "name": "@ux3/plugin-my-widget",
  "displayName": "My Widget",
  "categories": ["ui"],
  "mcp": {
    "tools": [
      {
        "name": "my-widget.list-components",
        "description": "List all available components",
        "inputSchema": { "type": "object" }
      }
    ],
    "resources": [
      {
        "uri": "plugin://my-widget/schemas",
        "mimeType": "application/json"
      }
    ],
    "systemPrompt": "..."
  }
}
```

## Patterns

### No Magic Strings

**❌ Bad: Magic strings in code**

```typescript
export const MyPlugin: Plugin = {
  async callTool(name: string, args: any) {
    switch (name) {
      case 'my-widget.list-components':
        return listComponents();
      case 'my-widget.inspect-component':
        return inspectComponent(args.componentName);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
```

**✅ Good: Constants + registry map**

```typescript
export const MyWidgetTools = {
  LIST_COMPONENTS: 'my-widget.list-components',
  INSPECT_COMPONENT: 'my-widget.inspect-component',
} as const;

export const myWidgetToolHandlers = {
  [MyWidgetTools.LIST_COMPONENTS]: async () => listComponents(),
  [MyWidgetTools.INSPECT_COMPONENT]: async (args) => inspectComponent(args.componentName),
} as const satisfies Record<string, (args: any) => Promise<any>>;

export const MyPlugin: Plugin = {
  async callTool(name: string, args: any) {
    const handler = myWidgetToolHandlers[name as keyof typeof myWidgetToolHandlers];
    if (!handler) throw new Error(`Unknown tool: ${name}`);
    return await handler(args);
  },
};
```

### Config is Source of Truth

Tool and resource names are declared once in `plugin.config.yaml`, then referenced via constants in code:

```yaml
# plugin.config.yaml — single source of truth
mcp:
  tools:
    - name: "my-widget.list-components"  # Declared here
      inputSchema: { type: "object" }
```

```typescript
// src/tools.ts — reference via constant
export const MyWidgetTools = {
  LIST_COMPONENTS: 'my-widget.list-components',  // Must match YAML
} as const;
```

**Build-time validation ensures the names match:**

If you update the name in YAML but forget to update the constant, the build will fail.

### Type Safety

Use `satisfies` to ensure handlers match tool/resource names:

```typescript
// ✅ Compiler ensures all tool names have handlers
export const myWidgetToolHandlers = {
  [MyWidgetTools.LIST_COMPONENTS]: async () => ({ /* ... */ }),
  [MyWidgetTools.INSPECT_COMPONENT]: async (args) => ({ /* ... */ }),
} as const satisfies Record<string, (args: any) => Promise<any>>;

// ❌ Missing a handler? Compiler error!
// export const myWidgetToolHandlers = {
//   [MyWidgetTools.LIST_COMPONENTS]: async () => ({ /* ... */ }),
//   // Missing INSPECT_COMPONENT handler!
// } as const satisfies Record<string, (args: any) => Promise<any>>;
```

## Plugin Categories

Choose appropriate categories for your plugin:

| Category | Use When |
|----------|----------|
| `ui` | Exports visual components, widgets, layouts |
| `service` | Provides data fetching, caching, business logic |
| `platform` | Integrates with external platforms (auth, payments, etc.) |
| `data` | Handles databases, ORMs, query builders |
| `auth` | Authentication/authorization (OAuth, JWT, etc.) |
| `analysis` | Analytics, monitoring, telemetry |
| `tooling` | Dev tools, CLI, build helpers |

## Testing

### Unit Tests

Test tool and resource handlers independently:

```typescript
import { describe, it, expect } from 'vitest';
import { MyWidgetTools, MyWidgetResources, myWidgetToolHandlers, myWidgetResourceHandlers } from '../../src/tools.js';

describe('MyWidget MCP Tools', () => {
  it('lists components', async () => {
    const result = await myWidgetToolHandlers[MyWidgetTools.LIST_COMPONENTS]({});
    expect(result).toHaveProperty('components');
    expect(Array.isArray(result.components)).toBe(true);
  });

  it('inspects a component', async () => {
    const result = await myWidgetToolHandlers[MyWidgetTools.INSPECT_COMPONENT]({
      componentName: 'MyWidget',
    });
    expect(result).toHaveProperty('componentName', 'MyWidget');
  });
});

describe('MyWidget MCP Resources', () => {
  it('returns component schemas as JSON', async () => {
    const json = await myWidgetResourceHandlers[MyWidgetResources.SCHEMAS]();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('returns documentation as markdown', async () => {
    const md = await myWidgetResourceHandlers[MyWidgetResources.DOCS]();
    expect(md).toContain('#'); // Markdown header
  });
});
```

### Integration Tests (Optional)

Test plugin registration and MCP discovery:

```typescript
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '@ux3/ux3';
import { MyWidgetPlugin } from '../../src/index.js';

describe('MyWidget Plugin Integration', () => {
  it('registers as a plugin', () => {
    const registry = new PluginRegistry();
    registry.register(MyWidgetPlugin);
    expect(registry.load('@ux3/plugin-my-widget')).toBe(MyWidgetPlugin);
  });

  it('exports MCP server config', () => {
    expect(MyWidgetPlugin.mcp).toBeDefined();
    expect(MyWidgetPlugin.mcp!.tools).toHaveLength(2);
    expect(MyWidgetPlugin.mcp!.resources).toHaveLength(2);
  });

  it('implements MCP handler methods', () => {
    expect(typeof MyWidgetPlugin.callTool).toBe('function');
    expect(typeof MyWidgetPlugin.readResource).toBe('function');
  });
});
```

## Best Practices

1. **One tool = one constant** — Define tool names as constants, never as magic strings
2. **Registry maps, not switches** — Use handler registry maps instead of switch statements
3. **Config is source of truth** — YAML holds tool/resource definitions, code references via constants
4. **Type-safe dispatch** — Use `satisfies` to ensure handler coverage
5. **Comprehensive prompts** — Write detailed system prompts for agents using your tools
6. **Schema validation** — Include full JSON Schema for tool inputs
7. **Resource content types** — Use appropriate MIME types (application/json, text/markdown, etc.)
8. **Consistent naming** — Use domain.action pattern for tool names (e.g., "chat.components.list")

## Troubleshooting

### Build-time Validation

The build process validates that:
- All tool names in `plugin.config.yaml` match exported constants in `src/tools.ts`
- All resource URIs in `plugin.config.yaml` match exported constants in `src/tools.ts`
- Handler registry maps cover all declared tools/resources

If validation fails, the build stops with a clear error message.

### Missing Tool Handler

```typescript
// Compiler error: Property '[MyWidgetTools.LIST_COMPONENTS]' is missing
export const myWidgetToolHandlers = {
  [MyWidgetTools.INSPECT_COMPONENT]: async (args) => ({ /* ... */ }),
} as const satisfies Record<string, (args: any) => Promise<any>>;
```

**Fix:** Add the missing handler to the registry map.

### Tool Name Mismatch

```yaml
# plugin.config.yaml
mcp:
  tools:
    - name: "my-widget.list-all-components"  # ← Different name
```

```typescript
// src/tools.ts
export const MyWidgetTools = {
  LIST_COMPONENTS: 'my-widget.list-components',  // ← Doesn't match
} as const;
```

**Fix:** Keep names in sync between YAML and constants.

## References

- [UX3 Framework Docs](../README.md)
- [MCP Protocol Spec](https://spec.modelcontextprotocol.io)
- [Plugin Registry API](../src/plugin/registry.ts)
- [Example Plugins](../packages/@ux3/plugin-*)
