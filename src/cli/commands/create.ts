import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { buildContext, emitScaffold, resolveTemplateDir } from '../template-engine.js';

const VALID_TEMPLATES = ['spa', 'admin', 'blog'] as const;
type ProjectTemplate = typeof VALID_TEMPLATES[number];

export const createCommand = new Command()
  .name('create')
  .description('Create a new UX3 project')
  .argument('<name>', 'project name')
  .option('--template <template>', `starter template (${VALID_TEMPLATES.join(', ')})`, 'spa')
  .option('--version <version>', 'semantic version', '0.0.0')
  .option('--dry-run', 'print files without writing them')
  .action(async (name: string, options: { template: string; version: string; dryRun?: boolean }) => {
    const template = VALID_TEMPLATES.includes(options.template as ProjectTemplate)
      ? (options.template as ProjectTemplate)
      : 'spa';

    console.log(`🎨 Creating UX3 project: ${name}`);
    console.log(`📋 Template: ${template}`);

    const projectDir = path.resolve(process.cwd(), name);

    // prevent accidental overwrite
    if (!options.dryRun) {
      const existing = await fs.stat(projectDir).catch(() => null);
      if (existing) {
        const entries = await fs.readdir(projectDir);
        if (entries.length > 0) {
          console.error(
            `❗ Project directory already exists and is not empty, aborting to avoid overwrite.`
          );
          process.exit(1);
        }
      }
    }

    const ctx = buildContext(name, { version: options.version });

    // Resolve section name: try variant-specific dir first, fall back to 'project'
    const variantSection = `project/${template}`;
    const variantDir = resolveTemplateDir(variantSection);
    const section = fsSync.existsSync(variantDir) ? variantSection : 'project';

    const written = await emitScaffold(section, ctx, projectDir, {
      dryRun: options.dryRun,
      force: false,
    });

    // Ensure extra empty directories exist (not representable as template files)
    if (!options.dryRun) {
      for (const dir of ['ux/style', 'ux/validation', 'ux/i18n', 'ux/token', 'public']) {
        await fs.mkdir(path.join(projectDir, dir), { recursive: true });
      }
    }

    if (options.dryRun) {
      console.log(`\n[dry-run] would create ${written.length} file(s) in ${projectDir}`);
    } else {
      console.log(`✅ Project created at ${projectDir} (${written.length} files)`);
      console.log(`\n📖 Next steps:\n`);
      console.log(`  cd ${name}`);
      console.log(`  npm install`);
      console.log(`  npm run dev\n`);
    }
  });
