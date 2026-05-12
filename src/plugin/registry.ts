import type { AppContext } from "../ui/app";
import type { Hook } from "../core/lifecycle";
import type { Tool, Resource } from "@modelcontextprotocol/sdk/types.js";

// reuse lifecycle enums via import if needed
type PluginHooks = {
  app?: Partial<Record<string, Hook[]>>;
  component?: Partial<Record<string, Hook[]>>;
  service?: Partial<Record<string, Hook[]>>;
};

export interface ComponentFactory {
  (...args: any[]): any;
}
export interface ServiceFactory {
  (...args: any[]): any;
}
export interface DirectiveFactory {
  (...args: any[]): any;
}

/**
 * MCP Server exported by a plugin (dev-server only; zero runtime overhead).
 * Uses native MCP SDK types directly for immediate client compatibility.
 */
export interface PluginMcpServer {
  /** MCP server name, e.g., 'chat', 'query-builder' (plugin name used as default) */
  name?: string;
  /** MCP tools — uses native MCP Tool type */
  tools?: Tool[];
  /** MCP resources — uses native MCP Resource type */
  resources?: Resource[];
  /** System prompt / instructions for agents using this server */
  systemPrompt?: string;
}

/**
 * Plugin metadata exported to config and discovery systems.
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  displayName?: string;
  author?: string;
  categories?: string[];
  ux3PeerVersion?: string;
  dependencies?: string[];
  hasMcp: boolean;
}

export interface Plugin {
  name: string;                          // Unique identifier
  version: string;                       // Semantic version
  /** Human-readable description for CLI and inspector */
  description?: string;
  /** Human-readable display name (default: name) */
  displayName?: string;
  /** Author/maintainer contact */
  author?: string;
  /** Plugin categories: 'ui', 'service', 'platform', 'data', 'auth', 'analysis', 'tooling' */
  categories?: string[];
  /** Semver range of @ux3/ux3 this plugin supports */
  ux3PeerVersion?: string;
  /** Names of other plugins that must be registered first */
  dependencies?: string[];
  install?(app: AppContext): void | Promise<void>;
  uninstall?(app: AppContext): void | Promise<void>;
  hooks?: PluginHooks;
  components?: Record<string, ComponentFactory>;
  services?: Record<string, ServiceFactory>;
  directives?: Record<string, DirectiveFactory>;
  utils?: Record<string, Function>;
  /** MCP Server config (dev-server only; zero runtime overhead) */
  mcp?: PluginMcpServer;
  
  /** Call an MCP tool exported by this plugin (dev-server only) */
  callTool?(name: string, args: Record<string, unknown>): Promise<unknown>;
  
  /** Read an MCP resource exported by this plugin (dev-server only) */
  readResource?(uri: string): Promise<string>;
}

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();

  /**
   * Register a plugin.
   * @param plugin  The plugin to register.
   * @param force   When true, allow overwriting an already-registered plugin
   *                (useful for hot-reload in dev mode).
   */
  register(plugin: Plugin, force = false): void {
    if (this.plugins.has(plugin.name) && !force) {
      throw new Error(`plugin already registered: ${plugin.name}`);
    }
    // verify declared dependencies are already registered
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(
            `plugin '${plugin.name}' requires '${dep}' to be registered first`
          );
        }
      }
    }
    this.plugins.set(plugin.name, plugin);
  }

  load(name: string): Plugin | null {
    return this.plugins.get(name) || null;
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  clear(): void {
    this.plugins.clear();
  }

  /**
   * List plugins that match a specific category.
   * @param category The category to filter by (e.g., 'ui', 'service', 'platform')
   * @returns Array of plugins in the specified category
   */
  listByCategory(category: string): Plugin[] {
    return Array.from(this.plugins.values()).filter(p =>
      p.categories?.includes(category)
    );
  }

  /**
   * Export metadata for all registered plugins (for discovery, CLI, etc).
   * @returns Array of plugin metadata records
   */
  exportMetadata(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      description: p.description,
      displayName: p.displayName,
      author: p.author,
      categories: p.categories,
      ux3PeerVersion: p.ux3PeerVersion,
      dependencies: p.dependencies,
      hasMcp: !!p.mcp?.tools?.length || !!p.mcp?.resources?.length,
    }));
  }

  /**
   * List all plugins that export an MCP server.
   * @returns Array of plugins with mcp defined
   */
  listMcpServers(): Array<{ plugin: Plugin; mcp: PluginMcpServer }> {
    return Array.from(this.plugins.values())
      .filter(p => p.mcp)
      .map(p => ({ plugin: p, mcp: p.mcp! }));
  }
}
