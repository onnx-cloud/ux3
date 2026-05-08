import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { createRequire } from 'module';
import type { GeneratedConfig } from '../../ui/context-builder.js';
import * as translateBuildTimeModule from '../../../packages/@ux3/plugin-translate/src/build-time.ts';
import type { BuildTimeTranslateConfig } from '../../../packages/@ux3/plugin-translate/src/build-time.ts';

const _require = createRequire(import.meta.url);

const applyBuildTimeTranslation =
  (translateBuildTimeModule as { applyBuildTimeTranslation?: typeof import('../../../packages/@ux3/plugin-translate/src/build-time.ts').applyBuildTimeTranslation }).applyBuildTimeTranslation ||
  (translateBuildTimeModule as { default?: { applyBuildTimeTranslation?: typeof import('../../../packages/@ux3/plugin-translate/src/build-time.ts').applyBuildTimeTranslation } }).default?.applyBuildTimeTranslation ||
  (translateBuildTimeModule as { 'module.exports'?: { applyBuildTimeTranslation?: typeof import('../../../packages/@ux3/plugin-translate/src/build-time.ts').applyBuildTimeTranslation } })['module.exports']?.applyBuildTimeTranslation;

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

async function loadI18nFromProject(projectDir: string): Promise<Record<string, Record<string, string>>> {
  const i18nDir = path.join(projectDir, 'ux', 'i18n');
  const i18n: Record<string, Record<string, string>> = {};
  if (!fsSync.existsSync(i18nDir)) return i18n;
  const localeDirs = await fs.readdir(i18nDir, { withFileTypes: true });
  for (const dirent of localeDirs) {
    if (!dirent.isDirectory()) continue;
    const locale = dirent.name;
    const localeDir = path.join(i18nDir, locale);
    const files = await fs.readdir(localeDir);
    i18n[locale] = {};
    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
      const yamlPath = path.join(localeDir, file);
      const raw = await fs.readFile(yamlPath, 'utf-8');
      try {
        const YAML = _require('yaml');
        const parsed = YAML.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const ns = file.replace(/\.(yaml|yml)$/, '');
          for (const [key, value] of Object.entries(parsed)) {
            i18n[locale][`${ns}.${key}`] = String(value);
          }
        }
      } catch (e) {
        console.warn(`[ux3 translate] could not parse ${yamlPath}: ${e}`);
      }
    }
  }
  return i18n;
}

async function runBuildTimeTranslation(
  projectDir: string,
  rootConfig: any,
  translateConfig: Record<string, unknown>
): Promise<{ translated: number; skipped: number }> {
  let translated = 0;
  let skipped = 0;

  try {
    const i18n = await loadI18nFromProject(projectDir);
    const genConfig: GeneratedConfig = {
      routes: [],
      services: {},
      machines: {},
      i18n,
      widgets: {},
      styles: {},
      templates: {},
    };
    const pluginConfig: BuildTimeTranslateConfig = {
      ...translateConfig,
      overwrite: translateConfig.forceTranslate === true,
    };
    const result = await applyBuildTimeTranslation(genConfig, pluginConfig);
    if (result && 'translatedKeys' in result) {
      translated = result.translatedKeys || 0;
    }
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
      rootConfig,
      { ...translateConfig, forceTranslate: options.force }
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
