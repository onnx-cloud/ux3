import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { ContentGenerator } from '../../build/content-generator.js';

async function runContentGenerate(projectDir: string, outputDir: string): Promise<void> {
  console.log('[UX3] generating content manifest...');
  const gen = new ContentGenerator({ projectDir, outputDir });
  const manifest = await gen.generate();
  await gen.emit(manifest);
  console.log(`✅ content manifest generated (${manifest.items.length} items)`);
}

export const contentCommand = new Command()
  .name('content')
  .description('Generate or manage markdown content manifest')
  .option('--project <dir>', 'project directory', '.')
  .option('--output <dir>', 'output directory for manifest (defaults to <project>/generated)')
  .option('--watch', 'watch content directory for changes and regenerate')
  .action(async (options) => {
    try {
      const projectDir = path.resolve(options.project || '.');
      const outputDir = options.output
        ? path.resolve(options.output)
        : path.join(projectDir, 'generated');

      await runContentGenerate(projectDir, outputDir);

      if (options.watch) {
        const contentDir = path.join(projectDir, 'content');
        if (!fs.existsSync(contentDir)) {
          console.warn(`[UX3] content directory not found: ${contentDir}`);
          return;
        }
        // use chokidar if available, otherwise fall back to fs.watch
        let watcher: any = null;
        try {
          const { default: chokidar } = await import('chokidar' as any);
          watcher = chokidar.watch(contentDir, { ignoreInitial: true });
          watcher.on('all', async (event: string, filePath: string) => {
            if (!filePath.endsWith('.md')) return;
            console.log(`[UX3:watch] ${event}: ${filePath} — regenerating...`);
            try {
              await runContentGenerate(projectDir, outputDir);
            } catch (err) {
              console.error('❌ watch regeneration failed:', err);
            }
          });
          console.log(`[UX3:watch] watching ${contentDir}`);
        } catch {
          // chokidar not available — fall back to native fs.watch
          fs.watch(contentDir, { recursive: true }, async (_event, filename) => {
            if (!filename || !String(filename).endsWith('.md')) return;
            console.log(`[UX3:watch] change detected: ${filename} — regenerating...`);
            try {
              await runContentGenerate(projectDir, outputDir);
            } catch (err) {
              console.error('❌ watch regeneration failed:', err);
            }
          });
          console.log(`[UX3:watch] watching ${contentDir} (native fs.watch)`);
        }
      }
    } catch (err) {
      console.error('❌ content command failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

