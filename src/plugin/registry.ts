import type { AppContext } from "../ui/app";
import type { Hook } from "../core/lifecycle";

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

export interface Plugin {
  name: string;                          // Unique identifier
  version: string;                       // Semantic version
  /** Human-readable description for CLI and inspector */
  description?: string;
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
}
