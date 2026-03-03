import { Plugin } from "./registry";
import { promises as fs } from "fs";
import { resolve, extname } from "path";

interface PluginModule {
  default?: unknown;
}

/**
 * Simple loader that can import plugins by package name or file path.
 * For security we only load from node_modules or explicit project paths.
 */
export class PluginLoader {
  loadFromPackage(packageName: string): Plugin {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(packageName) as PluginModule;
    if (!pkg || !pkg.default) {
      throw new Error(`package ${packageName} does not export a default plugin`);
    }
    return pkg.default as Plugin;
  }

  async loadFromPath(filePath: string): Promise<Plugin> {
    const abs = resolve(filePath);
    // Vite by default tries to transform dynamic imports which fails for
    // absolute file paths in temp directories (tests).  The `@vite-ignore`
    // comment tells Vite to leave it alone and let Node resolve it at runtime.
    let mod: PluginModule;
    try {
      mod = await import(/* @vite-ignore */ abs) as PluginModule;
    } catch (_err) {
      // fallback to require when import fails (common under Vitest)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mod = require(abs) as PluginModule;
    }
    if (!mod || !mod.default) {
      throw new Error(`module ${filePath} does not export a default plugin`);
    }
    return mod.default as Plugin;
  }

  async loadProjectPlugins(dir: string): Promise<Plugin[]> {
    const result: Plugin[] = [];
    async function walk(folder: string) {
      const entries = await fs.readdir(folder, { withFileTypes: true });
      for (const entry of entries) {
        const full = resolve(folder, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile() && ['.ts', '.js'].includes(extname(entry.name))) {
          try {
            // dynamic import requires relative or absolute path
            let mod: PluginModule;
            try {
              mod = await import(/* @vite-ignore */ full) as PluginModule;
            } catch (_err) {
              // try require
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              mod = require(full) as PluginModule;
            }
            if (mod && mod.default && typeof mod.default === 'object') {
              result.push(mod.default as Plugin);
            }
          } catch (err) {
            // log and continue; real logger not available yet
            // eslint-disable-next-line no-console
            console.warn('plugin load error', full, err);
          }
        }
      }
    }

    await walk(dir);
    return result;
  }
}
