import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { ContentGenerator } from '../../src/build/content-generator.js';

export const contentCommand = new Command()
  .name('content')
  .description('Generate or manage markdown content manifest')
  .option('--project <dir>', 'project directory', '.')
  .option('--output <dir>', 'output directory for manifest (defaults to <project>/generated)')
  .action(async (options) => {
    try {
      const projectDir = path.resolve(options.project || '.');
      const outputDir = options.output
        ? path.resolve(options.output)
        : path.join(projectDir, 'generated');

      console.log('[UX3] generating content manifest...');
      const gen = new ContentGenerator({ projectDir, outputDir });
      const manifest = await gen.generate();
      await gen.emit(manifest);
      console.log(`✅ content manifest generated (${manifest.items.length} items)`);
    } catch (err) {
      console.error('❌ content command failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });
