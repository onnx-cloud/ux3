import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { resolveTemplateDir } from '../template-engine.js';

interface HintOptions {
  project?: string;
  dryRun?: boolean;
  force?: boolean;
}

interface HintMapping {
  section: string;
  targetSubdir: string;
  mapRelativePath?: (rel: string) => string | null;
}

const HINT_MAPPINGS: HintMapping[] = [
  { section: 'view', targetSubdir: path.join('ux', 'view') },
  { section: 'routes', targetSubdir: path.join('ux', 'route') },
  { section: 'i18n', targetSubdir: path.join('ux', 'i18n') },
  { section: 'validation', targetSubdir: path.join('ux', 'validate') },
  { section: 'style', targetSubdir: path.join('ux', 'style') },
  {
    section: 'service',
    targetSubdir: path.join('ux', 'service'),
    mapRelativePath: (rel) => {
      if (rel.startsWith(`src${path.sep}services${path.sep}`)) return null;
      if (rel.startsWith(`ux${path.sep}service${path.sep}`)) {
        return rel.slice(`ux${path.sep}service${path.sep}`.length);
      }
      return rel;
    },
  },
];

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

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const rel = entry.name;
    const abs = path.join(dir, rel);
    if (entry.isDirectory()) {
      const nested = await listMarkdownFiles(abs);
      for (const n of nested) {
        files.push(path.join(rel, n));
      }
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.md')) {
      files.push(rel);
    }
  }

  return files;
}

async function syncHints(projectRoot: string, options: HintOptions): Promise<string[]> {
  const written: string[] = [];

  for (const mapping of HINT_MAPPINGS) {
    const sectionRoot = resolveTemplateDir(mapping.section);
    if (!fsSync.existsSync(sectionRoot)) continue;

    const hints = await listMarkdownFiles(sectionRoot);
    for (const rel of hints) {
      const mappedRel = mapping.mapRelativePath ? mapping.mapRelativePath(rel) : rel;
      if (!mappedRel) continue;

      const sourcePath = path.join(sectionRoot, rel);
      const targetPath = path.join(projectRoot, mapping.targetSubdir, mappedRel);

      if (!options.force && !options.dryRun && fsSync.existsSync(targetPath)) {
        continue;
      }

      if (options.dryRun) {
        console.log(`  [dry-run] ${targetPath}`);
      } else {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(sourcePath, targetPath);
      }

      written.push(targetPath);
    }
  }

  return written;
}

export function createHintsCommand(): Command {
  return new Command()
    .name('hints')
    .description('Sync scaffold markdown hints into ux source folders')
    .option('--project <dir>', 'project root directory (default: auto-detect)')
    .option('--dry-run', 'print files without writing them')
    .option('--force', 'overwrite existing files')
    .action(async (options: HintOptions) => {
      const projectRoot = options.project ? path.resolve(options.project) : findProjectRoot();
      const written = await syncHints(projectRoot, options);

      if (options.dryRun) {
        console.log(`\n[dry-run] hints: ${written.length} file(s) would be synced into ${projectRoot}`);
        return;
      }

      if (written.length === 0) {
        console.log('No hint updates were applied (files may already be up to date).');
        return;
      }

      console.log(`✅ Synced ${written.length} hint file(s)`);
      for (const f of written) {
        console.log(`   ${path.relative(process.cwd(), f)}`);
      }
    });
}

export const hintsCommand = createHintsCommand();
