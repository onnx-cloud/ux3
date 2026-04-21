import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { buildContext, emitScaffold } from '../template-engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

interface GenerateOptions {
  project?: string;
  dryRun?: boolean;
  force?: boolean;
}

async function generate(
  section: string,
  name: string,
  targetDir: string,
  options: GenerateOptions
): Promise<void> {
  const ctx = buildContext(name);
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();

  const written = await emitScaffold(section, ctx, targetDir, {
    dryRun: options.dryRun,
    force: options.force,
  }, projectRoot);

  if (options.dryRun) {
    console.log(`\n[dry-run] ${section} "${name}": ${written.length} file(s) would be written`);
  } else {
    console.log(`✅ ${section} "${name}" scaffolded (${written.length} file(s))`);
    for (const f of written) {
      console.log(`   ${path.relative(process.cwd(), f)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export const generateCommand = new Command()
  .name('generate')
  .alias('g')
  .description('Scaffold UX3 artifacts from templates');

// Shared options factory
function addSharedOptions(cmd: Command): Command {
  return cmd
    .option('--project <dir>', 'project root directory (default: auto-detect)')
    .option('--dry-run', 'print files without writing them')
    .option('--force', 'overwrite existing files');
}

// ---------------------------------------------------------------------------
// ux3 generate view <name>
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('view <name>')
    .description('Scaffold a FSM view (YAML + HTML templates)')
).action(async (name: string, options: GenerateOptions) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const targetDir = path.join(projectRoot, 'ux', 'view');
  await generate('view', name, targetDir, options).catch(die);
});

// ---------------------------------------------------------------------------
// ux3 generate logic <name>
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('logic <name>')
    .description('Scaffold a logic handler file for a view')
).action(async (name: string, options: GenerateOptions) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const targetDir = path.join(projectRoot, 'src', 'logic');
  await fs.mkdir(targetDir, { recursive: true });
  await generate('logic', name, targetDir, options).catch(die);
});

// ---------------------------------------------------------------------------
// ux3 generate routes
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('routes')
    .description('Scaffold a routes.yaml file')
).action(async (options: GenerateOptions) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const targetDir = path.join(projectRoot, 'ux', 'route');
  await fs.mkdir(targetDir, { recursive: true });
  // 'routes' section doesn't need a name; pass 'routes' as a dummy
  await generate('routes', 'routes', targetDir, options).catch(die);
});

// ---------------------------------------------------------------------------
// ux3 generate service <name>
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('service <name>')
    .description('Scaffold a service YAML declaration and TypeScript implementation')
).action(async (name: string, options: GenerateOptions) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  // Service template has nested dirs (ux/service/ and src/services/); emit into project root
  await generate('service', name, projectRoot, options).catch(die);
});

// ---------------------------------------------------------------------------
// ux3 generate i18n <locale>
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('i18n <locale>')
    .description('Scaffold an i18n locale YAML file')
).action(async (locale: string, options: GenerateOptions) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const targetDir = path.join(projectRoot, 'ux', 'i18n');
  await fs.mkdir(targetDir, { recursive: true });
  await generate('i18n', locale, targetDir, options).catch(die);
});

// ---------------------------------------------------------------------------
// ux3 generate validation <name>
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('validation <name>')
    .description('Scaffold a validation schema YAML file')
).action(async (name: string, options: GenerateOptions) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const targetDir = path.join(projectRoot, 'ux', 'validate');
  await fs.mkdir(targetDir, { recursive: true });
  await generate('validation', name, targetDir, options).catch(die);
});

// ---------------------------------------------------------------------------
// ux3 generate style <name>
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('style <name>')
    .description('Scaffold a style mapping YAML file')
).action(async (name: string, options: GenerateOptions) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const targetDir = path.join(projectRoot, 'ux', 'style');
  await fs.mkdir(targetDir, { recursive: true });
  await generate('style', name, targetDir, options).catch(die);
});

// ---------------------------------------------------------------------------
// ux3 generate plugin <name>
// ---------------------------------------------------------------------------
addSharedOptions(
  generateCommand
    .command('plugin <name>')
    .description('Scaffold a UX3 plugin package (alias for ux3 plugin create)')
    .option('--dir <path>', 'output directory (default: packages/@ux3/plugin-<name>)')
).action(async (name: string, options: GenerateOptions & { dir?: string }) => {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const slug = name.replace(/^plugin-/, '');
  const baseDir = options.dir
    ? path.resolve(options.dir)
    : path.join(projectRoot, 'packages', '@ux3', `plugin-${slug}`);

  if (!options.force && !options.dryRun && fsSync.existsSync(baseDir)) {
    console.error(`\n❌ Directory already exists: ${baseDir}\nUse --force to overwrite.`);
    process.exit(1);
  }

  await generate('plugin', slug, baseDir, options).catch(die);
});

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------
function die(err: unknown): never {
  console.error('❌', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
