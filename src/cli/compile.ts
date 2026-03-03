/**
 * UX3 Compiler CLI
 * 
 * Usage:
 * ux3 compile --views ./src/ux/view --output ./src/generated
 * ux3 compile --config ./ux3.config.json
 */

import * as fs from 'fs/promises';
import * as fss from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import YAML from 'yaml';
import { compileAllViews } from '../build/view-compiler.js';
import { mergeStyles } from '../build/style-utils.js';

interface CompilerConfig {
  views: string;
  output: string;
  baseDir?: string;
  fsms?: string;
  styles?: string;
  logicManifest?: boolean;
}

async function loadConfig(configPath: string): Promise<CompilerConfig> {
  const content = await fs.readFile(configPath, 'utf-8');
  const parsed = YAML.parse(content) as Record<string, unknown>;
  return (parsed.compile as CompilerConfig) || (parsed as CompilerConfig);
}

async function runCompiler(config: CompilerConfig): Promise<void> {
  // resolve directories relative to current working directory (useful for tests that override cwd)
  const viewsDir = config.views ? path.resolve(process.cwd(), config.views) : '';
  const outputDir = config.output ? path.resolve(process.cwd(), config.output) : '';

  console.log('[UX3 Compiler]');
  console.log(`Views:  ${viewsDir}`);
  console.log(`Output: ${outputDir}`);

  // Create output directory
  if (outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  // Compile views
  if (viewsDir) {
    try {
      // `compileAllViews` currently only accepts src and dest directories
      await compileAllViews(viewsDir, outputDir);
    } catch (e) {
      console.error('✗ View compilation failed:', e);
      process.exit(1);
    }

    if (config.logicManifest) {
      // read manifest files and print summary
      const items = await fs.readdir(outputDir);
      const manifests = items.filter((f) => f.endsWith('.logic.json'));
      console.log(`\nLogic manifests (${manifests.length}):`);
      for (const m of manifests) {
        const txt = await fs.readFile(path.join(outputDir, m), 'utf-8');
        console.log(`--- ${m} ---`);
        console.log(txt);
      }
    }
  }

  // Compile styles if a path was provided
  if (config.styles) {
    const stylesDir = path.resolve(config.styles);
    const stylesMap: Record<string,string> = {};
    const walk = (dir: string) => {
      if (!fss.existsSync(dir)) return;
      for (const entry of fss.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fss.statSync(full).isDirectory()) walk(full);
        else if (full.endsWith('.yaml') || full.endsWith('.yml')) {
          const cfg = YAML.parse(fss.readFileSync(full, 'utf-8')) as Record<string, unknown> | null;
          mergeStyles(stylesMap, cfg || {});
        }
      }
    };
    walk(stylesDir);
    // emit mapping to output for consumption by other tooling/tests
    const outPath = path.join(config.output, 'styles.json');
    await fs.writeFile(outPath, JSON.stringify(stylesMap, null, 2));
    console.log(`[UX3 Compiler] Generated styles map at ${outPath}`);
  }
  // TODO: Generate index.ts exports

  console.log('\n✓ Compilation complete');
}

export { runCompiler, loadConfig };

export const compileCommand = new Command()
  .name('compile')
  .description('Compile UX3 views into generated code')
  .option('--views <path>', 'source views directory')
  .option('--output <path>', 'output directory')
  .option('--config <path>', 'path to config file')
  .action(async (options: Record<string, unknown>) => {
    let config: CompilerConfig;
    if (options.config) {
      config = await loadConfig(options.config as string);
    } else {
      config = {
        views: (options.views as string) || '',
        output: (options.output as string) || '',
      };
    }

    await runCompiler(config);
  });

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: ux3 compile --config <path> | --views <path> --output <path>');
    process.exit(1);
  }

  let config: CompilerConfig;

  if (args[0] === '--config') {
    const configPath = args[1] || './ux3.config.json';
    config = await loadConfig(configPath);
  } else {
    // Parse inline arguments
    config = {
      views: '',
      output: '',
    };

    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1];

      switch (key) {
        case 'views':
          config.views = value;
          break;
        case 'output':
          config.output = value;
          break;
        case 'baseDir':
          config.baseDir = value;
          break;
        case 'fsms':
          config.fsms = value;
          break;
        case 'styles':
          config.styles = value;
          break;
        case 'logic-manifest':
          // presence of flag is enough; value may be undefined
          config.logicManifest = true;
          i -= 1; // don't consume a nonexistent value
          break;
      }
    }
  }

  await runCompiler(config);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
}
