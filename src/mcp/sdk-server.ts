import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ToolRegistry } from './tools.js';
import { ResourceRegistry } from './resources.js';

export function createSDKServer(projectDir: string): McpServer {
  const server = new McpServer({
    name: 'ux3-mcp',
    version: '0.1.0',
  });

  const toolRegistry = new ToolRegistry(projectDir);
  const resourceRegistry = new ResourceRegistry(projectDir);

  // Register all tools from toolRegistry
  const toolDefs = toolRegistry.getToolDefinitions();
  for (const toolDef of toolDefs) {
    const inputSchema = toZodObject((toolDef as any).inputSchema);

    server.registerTool(
      toolDef.name,
      {
        description: toolDef.description || 'Tool',
        inputSchema,
      },
      async (args: any) => {
        try {
          const result = await toolRegistry.executeTool(toolDef.name, args);
          return {
            content: [
              {
                type: 'text' as const,
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
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

  // Register resources as concrete URIs from current project state.
  for (const resource of resourceRegistry.listResources()) {
    const uri = resource.uri;
    server.registerResource(
      resource.name,
      uri,
      {
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async () => {
        const content = await resourceRegistry.readResource(uri);
        return {
          contents: [
            {
              uri,
              mimeType: resource.mimeType,
              text: content,
            },
          ],
        };
      }
    );
  }

  return server;
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
