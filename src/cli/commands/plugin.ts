import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import YAML from 'yaml';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the npm package name from a bare shorthand or full name.
 *  "analytics"         → "@ux3/plugin-analytics"
 *  "plugin-analytics"  → "@ux3/plugin-analytics"
 *  "@ux3/plugin-foo"   → "@ux3/plugin-foo"   (kept as-is)
 *  "my-company/plugin" → "my-company/plugin" (kept as-is)
 */
function resolvePackageName(raw: string): string {
  if (raw.startsWith('@') || raw.includes('/')) return raw;
  if (raw.startsWith('plugin-')) return `@ux3/${raw}`;
  return `@ux3/plugin-${raw}`;
}

/** Find the project root by walking up from cwd until we hit package.json. */
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

/** Load ux3.yaml / ux3.config.yaml from the project root. */
async function loadUx3Config(projectRoot: string): Promise<Record<string, unknown> | null> {
  const candidates = ['ux3.yaml', 'ux3.config.yaml', 'ux3.config.json'];
  for (const name of candidates) {
    const p = path.join(projectRoot, name);
    try {
      const text = await fs.readFile(p, 'utf-8');
      return name.endsWith('.json') ? JSON.parse(text) : YAML.parse(text);
    } catch {
      // try next
    }
  }
  return null;
}

/** Write ux3.yaml back to disk (or create it). */
async function saveUx3Config(projectRoot: string, cfg: Record<string, unknown>): Promise<void> {
  const p = path.join(projectRoot, 'ux3.yaml');
  await fs.writeFile(p, YAML.stringify(cfg), 'utf-8');
}

// ---------------------------------------------------------------------------
// ux3 plugin list
// ---------------------------------------------------------------------------

export async function listPlugins(projectRoot: string): Promise<void> {
  const installed: string[] = [];
  const local: string[] = [];

  // Scan node_modules/@ux3/plugin-*
  const nmUx3 = path.join(projectRoot, 'node_modules', '@ux3');
  try {
    const entries = await fs.readdir(nmUx3);
    for (const e of entries) {
      if (e.startsWith('plugin-')) installed.push(`@ux3/${e}`);
    }
  } catch {
    // no node_modules/@ux3 yet — that's fine
  }

  // Scan packages/@ux3/plugin-* (monorepo local packages)
  const pkgUx3 = path.join(projectRoot, 'packages', '@ux3');
  try {
    const entries = await fs.readdir(pkgUx3);
    for (const e of entries) {
      if (e.startsWith('plugin-')) local.push(`@ux3/${e} (local)`);
    }
  } catch {
    // no local packages dir — fine
  }

  // Also read plugins declared in ux3.yaml
  const cfg = await loadUx3Config(projectRoot);
  const declared: string[] = cfg?.plugins
    ? Object.keys(cfg.plugins as Record<string, unknown>)
    : [];

  const all = new Set([...installed, ...local.map((l) => l.split(' ')[0])]);

  console.log('\n📦 UX3 Plugins\n');

  if (declared.length) {
    console.log('Declared in ux3.yaml:');
    for (const name of declared) {
      const present = all.has(name) ? '✅ installed' : '⚠️  not installed';
      console.log(`  ${name}  ${present}`);
    }
    console.log('');
  }

  if (local.length) {
    console.log('Local packages:');
    for (const l of local) console.log(`  ${l}`);
    console.log('');
  }

  if (installed.length) {
    console.log('Installed in node_modules:');
    for (const p of installed) console.log(`  ${p}`);
    console.log('');
  }

  if (!declared.length && !local.length && !installed.length) {
    console.log('No plugins found. Run `ux3 plugin install <name>` to add one.');
  }
}

// ---------------------------------------------------------------------------
// ux3 plugin install <name>
// ---------------------------------------------------------------------------

async function installPlugin(raw: string, options: { dev?: boolean; save?: boolean }): Promise<void> {
  const pkgName = resolvePackageName(raw);
  const projectRoot = findProjectRoot();

  console.log(`\n⬇️  Installing ${pkgName} …`);

  const flag = options.dev ? '--save-dev' : '--save';
  try {
    execSync(`npm install ${flag} ${pkgName}`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch {
    console.error(`\n❌ npm install failed for ${pkgName}.`);
    process.exit(1);
  }

  // Add an empty config entry in ux3.yaml so the plugin is declared
  const cfg = (await loadUx3Config(projectRoot)) ?? {};
  const plugins = (cfg.plugins ?? {}) as Record<string, unknown>;
  if (!(pkgName in plugins)) {
    plugins[pkgName] = {};
    cfg.plugins = plugins;
    await saveUx3Config(projectRoot, cfg);
    console.log(`\n✅ Added ${pkgName} to ux3.yaml`);
  } else {
    console.log(`\nℹ️  ${pkgName} was already declared in ux3.yaml`);
  }

  console.log(`\n🎉 Plugin installed: ${pkgName}`);
  console.log(`   Configure it in ux3.yaml under plugins.${JSON.stringify(pkgName)}`);
}

// ---------------------------------------------------------------------------
// ux3 plugin create <name>
// ---------------------------------------------------------------------------

const PLUGIN_INDEX_TEMPLATE = (name: string, display: string) => `import type { Plugin } from '@ux3/core';

const ${name}: Plugin = {
  name: '${display}',
  description: 'TODO: describe your plugin',
  install(app) {
    // TODO: implement your plugin
    console.log('[${display}] installed');
  },
};

export default ${name};
`;

const PLUGIN_PACKAGE_TEMPLATE = (name: string, display: string) =>
  JSON.stringify(
    {
      name: display,
      version: '0.1.0',
      description: 'TODO: describe your plugin',
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: { build: 'tsc -p tsconfig.json' },
      peerDependencies: { '@ux3/core': '^0.1.0' },
      dependencies: {},
      keywords: ['ux3', 'plugin'],
    },
    null,
    2
  );

const PLUGIN_TSCONFIG_TEMPLATE = () =>
  JSON.stringify(
    {
      extends: '../../../../tsconfig.json',
      compilerOptions: { outDir: 'dist', rootDir: 'src' },
      include: ['src'],
    },
    null,
    2
  );

async function createPlugin(raw: string, options: { dir?: string }): Promise<void> {
  // "my-plugin" → camelCase "myPlugin" for the export name
  const slug = raw.replace(/^plugin-/, '');
  const pkgName = `@ux3/plugin-${slug}`;
  const exportName = slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

  const projectRoot = findProjectRoot();
  const baseDir = options.dir
    ? path.resolve(options.dir)
    : path.join(projectRoot, 'packages', '@ux3', `plugin-${slug}`);

  // Guard: don't overwrite
  if (fsSync.existsSync(baseDir)) {
    console.error(`\n❌ Directory already exists: ${baseDir}`);
    process.exit(1);
  }

  await fs.mkdir(path.join(baseDir, 'src'), { recursive: true });
  await fs.writeFile(path.join(baseDir, 'src', 'index.ts'), PLUGIN_INDEX_TEMPLATE(exportName, pkgName));
  await fs.writeFile(path.join(baseDir, 'package.json'), PLUGIN_PACKAGE_TEMPLATE(slug, pkgName));
  await fs.writeFile(path.join(baseDir, 'tsconfig.json'), PLUGIN_TSCONFIG_TEMPLATE());

  console.log(`\n🎨 Plugin scaffold created at ${baseDir}`);
  console.log(`\nFiles:`);
  console.log(`  ${path.relative(projectRoot, path.join(baseDir, 'package.json'))}`);
  console.log(`  ${path.relative(projectRoot, path.join(baseDir, 'tsconfig.json'))}`);
  console.log(`  ${path.relative(projectRoot, path.join(baseDir, 'src', 'index.ts'))}`);
  console.log(`\nNext steps:`);
  console.log(`  1. cd ${path.relative(process.cwd(), baseDir)}`);
  console.log(`  2. npm run build`);
  console.log(`  3. Add the plugin to your app's ux3.yaml under plugins`);
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export const pluginCommand = new Command()
  .name('plugin')
  .description('Manage UX3 plugins');

pluginCommand
  .command('list')
  .description('List installed and declared UX3 plugins')
  .option('--project <dir>', 'project root directory', '.')
  .action(async (options: { project?: string }) => {
    const root = path.resolve(options.project ?? '.');
    await listPlugins(root).catch((err) => {
      console.error('❌', err.message);
      process.exit(1);
    });
  });

pluginCommand
  .command('install <name>')
  .description('Install a UX3 plugin and declare it in ux3.yaml')
  .option('--dev', 'save as a dev dependency')
  .action(async (name: string, options: { dev?: boolean }) => {
    await installPlugin(name, options).catch((err) => {
      console.error('❌', err.message);
      process.exit(1);
    });
  });

pluginCommand
  .command('create <name>')
  .description('Scaffold a new UX3 plugin')
  .option('--dir <path>', 'output directory (default: packages/@ux3/plugin-<name>)')
  .action(async (name: string, options: { dir?: string }) => {
    await createPlugin(name, options).catch((err) => {
      console.error('❌', err.message);
      process.exit(1);
    });
  });
