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

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`plugin already registered: ${plugin.name}`);
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
