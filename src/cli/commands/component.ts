import { Command } from 'commander';
import fsSync from 'fs';
import path from 'path';
import { buildContext, emitScaffold } from '../template-engine.js';

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

interface ComponentCreateOptions {
  project?: string;
  dryRun?: boolean;
  force?: boolean;
}

async function createComponent(name: string, options: ComponentCreateOptions): Promise<void> {
  const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
  const written = await emitScaffold(
    'component',
    buildContext(name),
    projectRoot,
    {
      dryRun: options.dryRun,
      force: options.force,
    },
    projectRoot
  );

  if (options.dryRun) {
    console.log(`\n[dry-run] component "${name}": ${written.length} file(s) would be written`);
    return;
  }

  console.log(`✅ component "${name}" scaffolded (${written.length} file(s))`);
  for (const file of written) {
    console.log(`   ${path.relative(process.cwd(), file)}`);
  }
}

function die(err: unknown): never {
  console.error('❌', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

export const componentCommand = new Command()
  .name('component')
  .description('Manage reusable UX3 components');

componentCommand
  .command('create <name>')
  .description('Scaffold a reusable UX3 component package')
  .option('--project <dir>', 'project root directory (default: auto-detect)')
  .option('--dry-run', 'print files without writing them')
  .option('--force', 'overwrite existing files')
  .action(async (name: string, options: ComponentCreateOptions) => {
    await createComponent(name, options).catch(die);
  });