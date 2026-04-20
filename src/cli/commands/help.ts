import { Command } from 'commander';
import fsSync from 'fs';
import path from 'path';
import { loadConfig } from '../config-loader.js';
import { listPlugins } from './plugin.js';

function findProjectRoot(cwd = process.cwd()): string {
  let dir = cwd;
  for (let i = 0; i < 10; i++) {
    if (fsSync.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cwd;
}

function safeReadFile(filePath: string): string | null {
  try {
    return fsSync.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function extractObjectKeys(source: string, objectName: string): string[] {
  const pattern = new RegExp(`${objectName}\\s*:\\s*\\{`, 'g');
  const keys: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    let depth = 0;
    let i = match.index + match[0].length;
    let objectBody = '';

    for (; i < source.length; i += 1) {
      const char = source[i];
      if (char === '{') depth += 1;
      if (char === '}') {
        if (depth === 0) {
          objectBody = source.slice(match.index + match[0].length, i);
          break;
        }
        depth -= 1;
      }
    }

    if (!objectBody) continue;

    const keyPattern = /^[ \t]*['"]?([^'"\n]+?)['"]?\s*:/gm;
    let keyMatch: RegExpExecArray | null;
    while ((keyMatch = keyPattern.exec(objectBody))) {
      keys.push(keyMatch[1]);
    }
  }

  return [...new Set(keys)];
}

function collectPluginSources(projectRoot: string): string[] {
  const sources: string[] = [];
  const builtInDir = path.join(projectRoot, 'src', 'plugins');
  const packagesDir = path.join(projectRoot, 'packages', '@ux3');

  if (fsSync.existsSync(builtInDir)) {
    for (const entry of fsSync.readdirSync(builtInDir)) {
      if (entry.endsWith('.ts') || entry.endsWith('.js')) {
        sources.push(path.join(builtInDir, entry));
      }
    }
  }

  if (fsSync.existsSync(packagesDir)) {
    for (const pkg of fsSync.readdirSync(packagesDir)) {
      const srcDir = path.join(packagesDir, pkg, 'src');
      if (!fsSync.existsSync(srcDir)) continue;
      for (const entry of fsSync.readdirSync(srcDir)) {
        if (entry.endsWith('.ts') || entry.endsWith('.js')) {
          sources.push(path.join(srcDir, entry));
        }
      }
    }
  }

  return sources;
}

function listAvailableComponents(projectRoot: string): void {
  const sources = collectPluginSources(projectRoot);
  const components = new Map<string, string[]>();

  for (const sourcePath of sources) {
    const source = safeReadFile(sourcePath);
    if (!source) continue;
    const keys = extractObjectKeys(source, 'components');
    if (keys.length > 0) {
      components.set(path.relative(projectRoot, sourcePath), keys);
    }
  }

  console.log('\n🧩 UX3 components\n');

  if (components.size === 0) {
    console.log('No component definitions were discovered in built-in plugins or local packages.');
    console.log('Use `ux3 plugin list` to inspect available plugin packages.');
    return;
  }

  for (const [sourcePath, keys] of components) {
    console.log(`Source: ${sourcePath}`);
    for (const key of keys) {
      console.log(`  - ${key}`);
    }
    console.log('');
  }
}

async function listAvailableServices(projectRoot: string): Promise<void> {
  const config = await loadConfig(projectRoot, { validateMandatory: false }).catch(() => null);
  const serviceNames: string[] = [];

  if (config?.services) {
    if (Array.isArray(config.services)) {
      for (const [index, item] of config.services.entries()) {
        if (item && typeof item === 'object') {
          const name = (item as any).name || (item as any).id || `service[${index}]`;
          serviceNames.push(String(name));
        } else {
          serviceNames.push(`service[${index}]`);
        }
      }
    } else {
      serviceNames.push(...Object.keys(config.services));
    }
  }

  const sources = collectPluginSources(projectRoot);
  const serviceProviders = new Map<string, string[]>();

  for (const sourcePath of sources) {
    const source = safeReadFile(sourcePath);
    if (!source) continue;
    const keys = extractObjectKeys(source, 'services');
    if (keys.length > 0) {
      serviceProviders.set(path.relative(projectRoot, sourcePath), keys);
    }
  }

  console.log('\n🔧 UX3 services\n');

  if (serviceNames.length === 0) {
    console.log('No services declared in project config.');
  } else {
    console.log('Declared services from project config:');
    for (const name of serviceNames) {
      console.log(`  - ${name}`);
    }
    console.log('');
  }

  if (serviceProviders.size > 0) {
    console.log('Service factories discovered in plugin sources:');
    for (const [sourcePath, keys] of serviceProviders) {
      console.log(`Source: ${sourcePath}`);
      for (const key of keys) {
        console.log(`  - ${key}`);
      }
      console.log('');
    }
  } else if (serviceNames.length === 0) {
    console.log('No service factories were discovered in built-in plugins or local packages.');
  }
}

export const helpCommand = new Command('help')
  .description('Show UX3 help topics and available resources')
  .argument('[topic]', 'help topic: components, plugins, services')
  .option('--project <dir>', 'project root directory', '.')
  .action(async (topic: string | undefined, options: { project?: string }) => {
    const projectRoot = path.resolve(options.project ?? '.');
    const actualRoot = findProjectRoot(projectRoot);

    switch (topic?.toLowerCase()) {
      case 'components':
        listAvailableComponents(actualRoot);
        break;
      case 'plugins':
        await listPlugins(actualRoot);
        break;
      case 'services':
        await listAvailableServices(actualRoot);
        break;
      case undefined:
      case '':
        console.log('\nUX3 help topics:\n');
        console.log('  ux3 help components  - List available component definitions from plugins and local sources');
        console.log('  ux3 help plugins     - List installed and declared UX3 plugins');
        console.log('  ux3 help services    - List project and plugin-provided services');
        console.log('\nUse `ux3 help <topic> --project <dir>` to inspect another project.');
        break;
      default:
        console.log(`Unknown help topic: ${topic}`);
        console.log('Valid topics: components, plugins, services');
        process.exit(1);
    }
  });
