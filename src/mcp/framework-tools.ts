/**
 * Framework MCP Tools & Resources
 * 
 * Defines all MCP tools and resources that the UX3 framework itself exposes.
 * Uses constants + registry map pattern (no magic strings, no switch statements).
 * 
 * Config reference: Loaded from `src/mcp/framework-mcp.json` at build-time.
 * Build-time validation: Tool/resource names in config must match constants below.
 */

import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { AppContext } from '../ui/app.js';

// ============================================================================
// TOOL NAMES (constants, single source of truth)
// ============================================================================

export const Ux3Tools = {
  /** List all registered widgets with names and categories */
  WIDGETS_LIST: 'ux3.widgets.list',
  
  /** Inspect a specific widget schema, components, and properties */
  WIDGETS_INSPECT: 'ux3.widgets.inspect',
  
  /** List all available services and their methods */
  SERVICES_LIST: 'ux3.services.list',
  
  /** Inspect a specific service schema and capabilities */
  SERVICES_INSPECT: 'ux3.services.inspect',
  
  /** List all registered routes */
  ROUTES_LIST: 'ux3.routes.list',
  
  /** Inspect a specific route configuration */
  ROUTES_INSPECT: 'ux3.routes.inspect',
  
  /** List all i18n translation keys */
  I18N_KEYS: 'ux3.i18n.keys',
  
  /** List all registered plugins with metadata */
  PLUGINS_LIST: 'ux3.plugins.list',
  
  /** Compile and validate YAML view configuration */
  COMPILE_VIEW: 'ux3.compile.view',
  
  /** Validate i18n content against registered keys */
  VALIDATE_I18N: 'ux3.validate.i18n',
} as const;

// ============================================================================
// RESOURCE URIs (constants, single source of truth)
// ============================================================================

export const Ux3Resources = {
  /** UX3 framework documentation */
  FRAMEWORK_DOCS: 'plugin://ux3/docs/framework',
  
  /** Widget schema reference */
  SCHEMA_WIDGET: 'plugin://ux3/schema/widget',
  
  /** Service schema reference */
  SCHEMA_SERVICE: 'plugin://ux3/schema/service',
  
  /** Route schema reference */
  SCHEMA_ROUTE: 'plugin://ux3/schema/route',
  
  /** i18n schema reference */
  SCHEMA_I18N: 'plugin://ux3/schema/i18n',
  
  /** Validation schema reference */
  SCHEMA_VALIDATION: 'plugin://ux3/schema/validation',
} as const;

// ============================================================================
// TOOL HANDLERS (registry map, type-safe dispatch)
// ============================================================================

type ToolHandler = (args: Record<string, unknown>, app?: AppContext) => Promise<unknown>;

export const ux3ToolHandlers = {
  [Ux3Tools.WIDGETS_LIST]: async (args: Record<string, unknown>, app?: AppContext): Promise<unknown> => {
    // TODO: Implementation - return list of all widgets with metadata
    return { widgets: [] };
  },

  [Ux3Tools.WIDGETS_INSPECT]: async (
    args: Record<string, unknown>,
    app?: AppContext
  ): Promise<unknown> => {
    // TODO: Implementation - inspect specific widget
    // args: { widgetName: string }
    return { schema: {} };
  },

  [Ux3Tools.SERVICES_LIST]: async (args: Record<string, unknown>, app?: AppContext): Promise<unknown> => {
    // TODO: Implementation - return list of all services
    return { services: [] };
  },

  [Ux3Tools.SERVICES_INSPECT]: async (
    args: Record<string, unknown>,
    app?: AppContext
  ): Promise<unknown> => {
    // TODO: Implementation - inspect specific service
    // args: { serviceName: string }
    return { schema: {} };
  },

  [Ux3Tools.ROUTES_LIST]: async (args: Record<string, unknown>, app?: AppContext): Promise<unknown> => {
    // TODO: Implementation - return list of all routes
    return { routes: [] };
  },

  [Ux3Tools.ROUTES_INSPECT]: async (
    args: Record<string, unknown>,
    app?: AppContext
  ): Promise<unknown> => {
    // TODO: Implementation - inspect specific route
    // args: { routePath: string }
    return { config: {} };
  },

  [Ux3Tools.I18N_KEYS]: async (args: Record<string, unknown>, app?: AppContext): Promise<unknown> => {
    // TODO: Implementation - return all i18n keys
    return { keys: [] };
  },

  [Ux3Tools.PLUGINS_LIST]: async (args: Record<string, unknown>, app?: AppContext): Promise<unknown> => {
    // TODO: Implementation - return all plugins with metadata
    return { plugins: [] };
  },

  [Ux3Tools.COMPILE_VIEW]: async (
    args: Record<string, unknown>,
    app?: AppContext
  ): Promise<unknown> => {
    // TODO: Implementation - compile YAML view config
    // args: { yaml: string }
    return { compiled: {} };
  },

  [Ux3Tools.VALIDATE_I18N]: async (
    args: Record<string, unknown>,
    app?: AppContext
  ): Promise<unknown> => {
    // TODO: Implementation - validate i18n content
    // args: { keys: string[] }
    return { valid: true, errors: [] };
  },
} as const satisfies Record<string, ToolHandler>;

// ============================================================================
// RESOURCE HANDLERS (registry map, type-safe dispatch)
// ============================================================================

type ResourceHandler = () => Promise<string>;

export const ux3ResourceHandlers = {
  [Ux3Resources.FRAMEWORK_DOCS]: async (): Promise<string> => {
    // TODO: Implementation - return framework documentation
    return '# UX3 Framework Documentation\n\n...';
  },

  [Ux3Resources.SCHEMA_WIDGET]: async (): Promise<string> => {
    // TODO: Implementation - return widget JSON schema
    return JSON.stringify({ type: 'object' });
  },

  [Ux3Resources.SCHEMA_SERVICE]: async (): Promise<string> => {
    // TODO: Implementation - return service JSON schema
    return JSON.stringify({ type: 'object' });
  },

  [Ux3Resources.SCHEMA_ROUTE]: async (): Promise<string> => {
    // TODO: Implementation - return route JSON schema
    return JSON.stringify({ type: 'object' });
  },

  [Ux3Resources.SCHEMA_I18N]: async (): Promise<string> => {
    // TODO: Implementation - return i18n JSON schema
    return JSON.stringify({ type: 'object' });
  },

  [Ux3Resources.SCHEMA_VALIDATION]: async (): Promise<string> => {
    // TODO: Implementation - return validation JSON schema
    return JSON.stringify({ type: 'object' });
  },
} as const satisfies Record<string, ResourceHandler>;

// ============================================================================
// DISPATCHER FUNCTIONS
// ============================================================================

/**
 * Call a framework tool by name.
 * @param name Tool name (should be a Ux3Tools constant)
 * @param args Tool arguments
 * @param app AppContext (optional)
 * @returns Tool result
 * @throws Error if tool not found
 */
export async function callFrameworkTool(
  name: string,
  args: Record<string, unknown>,
  app?: AppContext
): Promise<unknown> {
  const handler = ux3ToolHandlers[name as keyof typeof ux3ToolHandlers];
  if (!handler) {
    throw new Error(`Unknown framework tool: ${name}`);
  }
  return handler(args, app);
}

/**
 * Read a framework resource by URI.
 * @param uri Resource URI (should be a Ux3Resources constant)
 * @returns Resource content
 * @throws Error if resource not found
 */
export async function readFrameworkResource(uri: string): Promise<string> {
  const handler = ux3ResourceHandlers[uri as keyof typeof ux3ResourceHandlers];
  if (!handler) {
    throw new Error(`Unknown framework resource: ${uri}`);
  }
  return handler();
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * All framework tool names (for validation and discovery).
 */
export const ALL_FRAMEWORK_TOOLS = Object.values(Ux3Tools);

/**
 * All framework resource URIs (for validation and discovery).
 */
export const ALL_FRAMEWORK_RESOURCES = Object.values(Ux3Resources);
