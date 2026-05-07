import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

interface TranslateOptions {
  force?: boolean;
  project?: string;
  dryRun?: boolean;
}

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

async function loadTranslatorConfig(projectDir: string): Promise<any> {
  const candidates = [
    path.join(projectDir, 'ux3.yaml'),
    path.join(projectDir, 'ux', 'ux3.yaml'),
  ];
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      const raw = await fs.readFile(candidate, 'utf-8');
      try {
        const YAML = _require('yaml');
        return YAML.parse(raw);
      } catch {
        console.warn(`[ux3 translate] could not parse ${candidate}`);
      }
    }
  }
  return null;
}

async function runBuildTimeTranslation(
  projectDir: string,
  config: any
): Promise<{ translated: number; skipped: number }> {
  let translated = 0;
  let skipped = 0;

  try {
    const { applyBuildTimeTranslation } = await import(
      '../../packages/@ux3/plugin-translate/src/build-time.js'
    );
    const result = await applyBuildTimeTranslation(projectDir, config);
    if ('translated' in result && 'skipped' in result) {
      return result as { translated: number; skipped: number };
    }
    translated = 1;
  } catch (e) {
    console.warn(
      '[ux3 translate] build-time translation skipped:',
      e instanceof Error ? e.message : String(e)
    );
  }

  return { translated, skipped };
}

export const translateCommand = new Command()
  .name('translate')
  .alias('t')
  .description('Run AI-powered locale translation via the translate plugin')
  .option('--force', 're-translate even when target is newer than source')
  .option('--project <dir>', 'project root directory (default: auto-detect)')
  .option('--dry-run', 'print what would be translated without writing files')
  .action(async (options: TranslateOptions) => {
    const projectDir = options.project
      ? path.resolve(options.project)
      : findProjectRoot();

    if (!fsSync.existsSync(path.join(projectDir, 'package.json'))) {
      console.error(`\n❌ No project found at ${projectDir}`);
      process.exit(1);
    }

    const rootConfig = await loadTranslatorConfig(projectDir);
    if (!rootConfig) {
      console.error('\n❌ No ux3.yaml found in project.');
      console.error('   Create ux/ux3.yaml with a translator plugin config.');
      process.exit(1);
    }

    // Validate translator config
    const pluginEntries: any[] = Array.isArray(rootConfig.plugins)
      ? rootConfig.plugins
      : [];
    const translateEntry = pluginEntries.find(
      (entry: any) =>
        (typeof entry === 'string' && entry === '@ux3/plugin-translate') ||
        (entry && entry.name === '@ux3/plugin-translate')
    );

    if (!translateEntry) {
      console.error(
        '\n❌ No @ux3/plugin-translate configured in ux3.yaml plugins.'
      );
      console.error('   Add it with endpoint, model, apiKey, and locales.');
      process.exit(1);
    }

    const translateConfig =
      typeof translateEntry === 'object' ? translateEntry.config || {} : {};

    const requiredKeys = ['endpoint', 'model', 'apiKey', 'locales'];
    const missing = requiredKeys.filter((k) => !translateConfig[k]);
    if (missing.length > 0) {
      console.error(
        `\n❌ Missing required translator config keys: ${missing.join(', ')}`
      );
      console.error('   All of endpoint, model, apiKey, and locales are mandatory.');
      process.exit(1);
    }

    if (options.dryRun) {
      console.log(`\n[dry-run] would translate with config:`);
      console.log(`   endpoint: ${translateConfig.endpoint}`);
      console.log(`   model:    ${translateConfig.model}`);
      console.log(`   locales:  ${translateConfig.locales.join(', ')}`);
      console.log(`   force:    ${options.force ? 'yes' : 'no (incremental)'}`);
      return;
    }

    console.log(`\n🌐 Translating with ${translateConfig.model}...`);
    console.log(`   Source:  ${translateConfig.defaultLocale || 'en'}`);
    console.log(`   Targets: ${translateConfig.locales.join(', ')}`);

    const { translated, skipped } = await runBuildTimeTranslation(
      projectDir,
      { ...rootConfig, forceTranslate: options.force }
    );

    if (translated > 0) {
      console.log(`✅ ${translated} file(s) translated`);
    }
    if (skipped > 0) {
      console.log(`   ${skipped} file(s) skipped (up-to-date)`);
    }
    if (translated === 0 && skipped === 0) {
      console.log('⚠️  No translation output produced.');
      console.log('   Ensure content/ directories exist with source i18n files.');
    }
  });
