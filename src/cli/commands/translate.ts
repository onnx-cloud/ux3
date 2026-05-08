import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { createRequire } from 'module';
import type { GeneratedConfig } from '../../ui/context-builder.js';
import * as translateModule from '../../../packages/@ux3/plugin-translate/src/build-time.ts';
import type { BuildTimeTranslateConfig } from '../../../packages/@ux3/plugin-translate/src/build-time.ts';
import { resolveConfigTemplates } from '../../utils/env-template.js';

const _require = createRequire(import.meta.url);

const applyBuildTimeTranslation =
  (translateModule as { applyBuildTimeTranslation?: typeof import('../../../packages/@ux3/plugin-translate/src/build-time.ts').applyBuildTimeTranslation }).applyBuildTimeTranslation ||
  (translateModule as { default?: { applyBuildTimeTranslation?: typeof import('../../../packages/@ux3/plugin-translate/src/build-time.ts').applyBuildTimeTranslation } }).default?.applyBuildTimeTranslation ||
  (translateModule as { 'module.exports'?: { applyBuildTimeTranslation?: typeof import('../../../packages/@ux3/plugin-translate/src/build-time.ts').applyBuildTimeTranslation } })['module.exports']?.applyBuildTimeTranslation;

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
        return resolveConfigTemplates(YAML.parse(raw));
      } catch {
        console.warn(`[ux3 translate] could not parse ${candidate}`);
      }
    }
  }
  return null;
}

async function runBuildTimeTranslation(
  projectDir: string,
  translateConfig: Record<string, unknown>,
  force: boolean,
  dryRun: boolean
): Promise<{ translated: number; skipped: number; files: string[] }> {
  let translated = 0;
  let skipped = 0;
  const written: string[] = [];

  try {
    const YAML = _require('yaml');
    const sourceLocale = (translateConfig.defaultLocale as string) || 'en';
    const targetLocales: string[] = (Array.isArray(translateConfig.locales)
      ? (translateConfig.locales as string[]).filter((l: string) => l !== sourceLocale)
      : []);

    if (targetLocales.length === 0) {
      console.warn('[ux3 translate] no target locales configured');
      return { translated, skipped, files: [] };
    }

    const i18nDir = path.join(projectDir, 'ux', 'i18n');
    const sourceDir = path.join(i18nDir, sourceLocale);
    if (!fsSync.existsSync(sourceDir)) {
      console.warn(`[ux3 translate] source locale directory not found: ${sourceDir}`);
      return { translated, skipped, files: [] };
    }

    const sourceFiles = (await fs.readdir(sourceDir, { withFileTypes: true }))
      .filter((d) => d.isFile() && (d.name.endsWith('.yaml') || d.name.endsWith('.yml')))
      .map((d) => d.name);

    if (sourceFiles.length === 0) {
      console.warn(`[ux3 translate] no i18n files found in ${sourceDir}`);
      return { translated, skipped, files: [] };
    }

    console.log(`\n🌐 Translating ${sourceLocale} → ${targetLocales.join(', ')}`);

    const pluginConfig: BuildTimeTranslateConfig = { ...translateConfig, overwrite: true };

    for (const fileName of sourceFiles) {
      const sourcePath = path.join(sourceDir, fileName);
      const ns = fileName.replace(/\.(yaml|yml)$/, '');
      const raw = await fs.readFile(sourcePath, 'utf-8');
      let parsed: Record<string, unknown>;
      try {
        parsed = (YAML.parse(raw) || {}) as Record<string, unknown>;
      } catch {
        console.warn(`[ux3 translate] could not parse ${sourcePath}, skipping`);
        continue;
      }

      const sourceKeys: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        sourceKeys[`${ns}.${key}`] = String(value);
      }

      if (Object.keys(sourceKeys).length === 0) continue;

      let needsTranslation = false;
      for (const locale of targetLocales) {
        const targetPath = path.join(i18nDir, locale, fileName);
        if (!fsSync.existsSync(targetPath)) {
          needsTranslation = true;
          break;
        }
        if (force) {
          needsTranslation = true;
          break;
        }
        const srcStat = await fs.stat(sourcePath);
        const tgtStat = await fs.stat(targetPath);
        if (srcStat.mtimeMs > tgtStat.mtimeMs) {
          needsTranslation = true;
          break;
        }
        skipped += Object.keys(sourceKeys).length;
      }

      if (!needsTranslation) continue;

      const i18n: Record<string, Record<string, string>> = {};
      i18n[sourceLocale] = sourceKeys;
      for (const locale of targetLocales) {
        const targetPath = path.join(i18nDir, locale, fileName);
        i18n[locale] = {};
        if (fsSync.existsSync(targetPath)) {
          try {
            const tgtRaw = await fs.readFile(targetPath, 'utf-8');
            const tgtParsed = (YAML.parse(tgtRaw) || {}) as Record<string, unknown>;
            for (const [key, value] of Object.entries(tgtParsed)) {
              i18n[locale][`${ns}.${key}`] = String(value);
            }
          } catch { /* start fresh */ }
        }
      }

      const genConfig: GeneratedConfig = {
        routes: [],
        services: {},
        machines: {},
        i18n,
        widgets: {},
        styles: {},
        templates: {},
      };

      const result = await applyBuildTimeTranslation(genConfig, pluginConfig);
      if (result && result.translatedKeys > 0) {
        translated += result.translatedKeys;

        if (!dryRun) {
          for (const locale of targetLocales) {
            const localeDir = path.join(i18nDir, locale);
            if (!fsSync.existsSync(localeDir)) {
              await fs.mkdir(localeDir, { recursive: true });
            }
            const outPath = path.join(localeDir, fileName);
            const outKeys: Record<string, unknown> = {};
            for (const [fullKey, value] of Object.entries(i18n[locale])) {
              const key = fullKey.slice(ns.length + 1);
              outKeys[key] = value;
            }
            const yamlStr = YAML.stringify(outKeys, { lineWidth: 0 });
            await fs.writeFile(outPath, yamlStr, 'utf-8');
            written.push(`ux/i18n/${locale}/${fileName}`);
          }
        }
      }
    }
  } catch (e) {
    console.warn(
      '[ux3 translate] build-time translation skipped:',
      e instanceof Error ? e.message : String(e)
    );
  }

  return { translated, skipped, files: written };
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

    const pluginEntries: any[] = Array.isArray(rootConfig.plugins)
      ? rootConfig.plugins
      : [];
    const translateEntry = pluginEntries.find(
      (entry: any) =>
        (typeof entry === 'string' && entry === '@ux3/plugin-translate') ||
        (entry && entry.name === '@ux3/plugin-translate')
    );

    if (!translateEntry) {
      console.error('\n❌ No @ux3/plugin-translate configured in ux3.yaml plugins.');
      process.exit(1);
    }

    const translateConfig =
      typeof translateEntry === 'object' ? translateEntry.config || {} : {};

    const requiredKeys = ['endpoint', 'model', 'apiKey', 'locales'];
    const missing = requiredKeys.filter((k) => !translateConfig[k]);
    if (missing.length > 0) {
      console.error(`\n❌ Missing required translator config keys: ${missing.join(', ')}`);
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

    const { translated, skipped, files } = await runBuildTimeTranslation(
      projectDir,
      translateConfig,
      options.force === true,
      false
    );

    if (translated > 0) {
      console.log(`✅ ${translated} key(s) translated across ${files.length} file(s)`);
      for (const f of files) {
        console.log(`   ${f}`);
      }
    }
    if (skipped > 0) {
      console.log(`   ${skipped} key(s) skipped (target up-to-date)`);
    }
    if (translated === 0 && skipped === 0) {
      console.log('⚠️  No translation output produced.');
      console.log('   Ensure content/ directories exist with source i18n files.');
    }
  });
