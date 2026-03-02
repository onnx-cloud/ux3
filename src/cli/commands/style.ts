import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import YAML from 'yaml';
import { mergeStyles } from '../../build/style-utils.js';

// ---------------------------------------------------------------------------
// ux3 style list
// ---------------------------------------------------------------------------

async function listStyles(stylesDir: string, format: 'table' | 'json'): Promise<void> {
  if (!fsSync.existsSync(stylesDir)) {
    console.error(`❌ styles directory not found: ${stylesDir}`);
    process.exit(1);
  }

  const stylesMap: Record<string, string> = {};

  const walk = (dir: string) => {
    if (!fsSync.existsSync(dir)) return;
    for (const entry of fsSync.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fsSync.statSync(full).isDirectory()) {
        walk(full);
      } else if (full.endsWith('.yaml') || full.endsWith('.yml')) {
        try {
          const cfg = YAML.parse(fsSync.readFileSync(full, 'utf-8')) || {};
          mergeStyles(stylesMap, cfg);
        } catch (err) {
          console.warn(`⚠️  Could not parse ${full}: ${(err as Error).message}`);
        }
      }
    }
  };

  walk(stylesDir);

  const keys = Object.keys(stylesMap).sort();

  if (keys.length === 0) {
    console.log('No style keys found in', stylesDir);
    return;
  }

  if (format === 'json') {
    console.log(JSON.stringify(stylesMap, null, 2));
    return;
  }

  // table format
  const maxKey = Math.max(3, ...keys.map((k) => k.length));
  const sep = `${'─'.repeat(maxKey + 2)}┼${'─'.repeat(52)}`;

  console.log(`\n🎨 Style keys from ${stylesDir}\n`);
  console.log(` ${'Key'.padEnd(maxKey)} │ Classes`);
  console.log(sep);

  for (const key of keys) {
    const classes = stylesMap[key] ?? '';
    const display = classes.length > 50 ? classes.slice(0, 49) + '…' : classes;
    console.log(` ${key.padEnd(maxKey)} │ ${display}`);
  }

  console.log(`\n${keys.length} key(s) total`);
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export const styleCommand = new Command()
  .name('style')
  .description('Inspect UX3 style definitions');

styleCommand
  .command('list')
  .description('List all resolved style keys and their CSS classes')
  .option('--styles <dir>', 'styles directory (default: ux/style relative to project)', '')
  .option('--project <dir>', 'project root directory', '.')
  .option('--format <fmt>', 'output format: table or json', 'table')
  .action(async (options: { styles?: string; project?: string; format?: string }) => {
    const projectRoot = path.resolve(options.project ?? '.');
    const stylesDir = options.styles
      ? path.resolve(options.styles)
      : path.join(projectRoot, 'ux', 'style');

    const fmt = options.format === 'json' ? 'json' : 'table';

    await listStyles(stylesDir, fmt).catch((err) => {
      console.error('❌', err.message);
      process.exit(1);
    });
  });
