/**
 * UX3 Compiler CLI
 * 
 * Usage:
 * ux3 compile --views ./src/ux/view --output ./src/generated
 * ux3 compile --config ./ux3.config.json
 */

import * as fs from 'fs/promises';
import YAML from 'yaml';
import { compileAllViews } from '../build/view-compiler.js';

interface CompilerConfig {
  views: string;
  output: string;
  baseDir?: string;
  fsms?: string;
  styles?: string;
}

async function loadConfig(configPath: string): Promise<CompilerConfig> {
  const content = await fs.readFile(configPath, 'utf-8');
  const parsed = YAML.parse(content);
  return parsed.compile || parsed;
}

async function runCompiler(config: CompilerConfig): Promise<void> {
  console.log('[UX3 Compiler]');
  console.log(`Views:  ${config.views}`);
  console.log(`Output: ${config.output}`);

  // Create output directory
  await fs.mkdir(config.output, { recursive: true });

  // Compile views
  if (config.views) {
    try {
      await compileAllViews(config.views, config.output, config.baseDir);
    } catch (e) {
      console.error('✗ View compilation failed:', e);
      process.exit(1);
    }
  }

  // TODO: Compile FSM configs
  // TODO: Compile styles
  // TODO: Generate index.ts exports

  console.log('\n✓ Compilation complete');
}

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
      }
    }
  }

  await runCompiler(config);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
