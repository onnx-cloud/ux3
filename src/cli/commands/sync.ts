import { Command } from 'commander';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import YAML from 'yaml';
import { createHintsCommand, syncHints } from './hints.js';

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

interface SyncOptions {
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

function resolveProject(options: SyncOptions): string {
  return options.project ? path.resolve(options.project) : findProjectRoot();
}

function walkFiles(dir: string, ext: string | string[]): string[] {
  if (!fsSync.existsSync(dir)) return [];
  const exts = Array.isArray(ext) ? ext : [ext];
  const result: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const entry of fsSync.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (exts.some(e => entry.name.endsWith(e))) result.push(full);
    }
  }
  return result;
}

function reportWritten(written: string[], cwd: string, dryRun: boolean, label: string): void {
  if (dryRun) {
    console.log(`\n[dry-run] sync ${label}: ${written.length} file(s) would be created/updated`);
    return;
  }
  if (written.length === 0) {
    console.log(`sync ${label}: nothing to do (all files already present)`);
    return;
  }
  console.log(`✅ sync ${label}: ${written.length} file(s) written`);
  for (const f of written) console.log(`   ${path.relative(cwd, f)}`);
}

// ---------------------------------------------------------------------------
// sync view — stub missing HTML templates referenced by view YAMLs
// ---------------------------------------------------------------------------

/**
 * Resolve a template path reference (from a view YAML) to an absolute file path.
 * Supports:  view/foo/bar.html  →  <root>/ux/view/foo/bar.html
 *            ux/view/foo/bar.html  →  <root>/ux/view/foo/bar.html
 *            bar.html (bare)      →  <root>/ux/view/<viewName>/bar.html
 */
function resolveTemplatePath(templateRef: string, projectRoot: string, viewName: string): string {
  if (templateRef.startsWith('ux/view/') || templateRef.startsWith('ux\\view\\')) {
    return path.join(projectRoot, templateRef);
  }
  if (templateRef.startsWith('view/') || templateRef.startsWith('view\\')) {
    return path.join(projectRoot, 'ux', templateRef);
  }
  // bare filename — place next to other templates for this view
  return path.join(projectRoot, 'ux', 'view', viewName, templateRef);
}

/** Return all template refs from a parsed view YAML (flat or nested states). */
function extractTemplateRefs(data: Record<string, unknown>): Array<{ stateName: string; ref: string }> {
  const refs: Array<{ stateName: string; ref: string }> = [];
  const states = data?.states as Record<string, unknown> | undefined;
  if (!states || typeof states !== 'object') return refs;

  for (const [stateName, stateVal] of Object.entries(states)) {
    if (!stateVal) continue;
    if (typeof stateVal === 'string') {
      // shorthand: stateName: path/to/template.html
      refs.push({ stateName, ref: stateVal });
    } else if (typeof stateVal === 'object') {
      const template = (stateVal as Record<string, unknown>).template as string | undefined;
      if (template) refs.push({ stateName, ref: template });
    }
  }
  return refs;
}

function stubHtml(viewName: string, stateName: string): string {
  return `<div ux-state="${viewName}.${stateName}">
  <!-- TODO: implement ${stateName} template for ${viewName} view -->
</div>
`;
}

async function syncView(projectRoot: string, options: SyncOptions): Promise<string[]> {
  const written: string[] = [];
  const viewsDir = path.join(projectRoot, 'ux', 'view');
  const yamlFiles = walkFiles(viewsDir, ['.yaml', '.yml']);

  for (const yamlFile of yamlFiles) {
    let data: Record<string, unknown>;
    try {
      data = (YAML.parse(fsSync.readFileSync(yamlFile, 'utf-8')) as Record<string, unknown>) ?? {};
    } catch {
      continue;
    }

    const viewName = path.basename(yamlFile, path.extname(yamlFile));
    const refs = extractTemplateRefs(data);

    for (const { stateName, ref } of refs) {
      const targetPath = resolveTemplatePath(ref, projectRoot, viewName);
      if (fsSync.existsSync(targetPath)) continue;

      if (options.dryRun) {
        console.log(`  [dry-run] ${targetPath}`);
      } else {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, stubHtml(viewName, stateName), 'utf-8');
      }
      written.push(targetPath);
    }
  }

  return written;
}

// ---------------------------------------------------------------------------
// sync i18n — add missing i18n keys referenced in HTML/YAML to locale files
// ---------------------------------------------------------------------------

/** Extract all i18n keys referenced in HTML/YAML source files. */
function collectI18nKeyUsages(projectRoot: string): Set<string> {
  const keys = new Set<string>();
  const viewDir = path.join(projectRoot, 'ux', 'view');
  const layoutDir = path.join(projectRoot, 'ux', 'layout');

  const htmlFiles = [
    ...walkFiles(viewDir, '.html'),
    ...walkFiles(layoutDir, '.html'),
  ];

  const dotPattern = /\{\{\s*i18n\.([a-zA-Z0-9_.]+)\s*\}\}/g;
  const callPattern = /\{\{\s*i18n\(['"]([^'"]+)['"]\)\s*\}\}/g;
  const yamlPattern = /\$t\(['"]([^'"]+)['"]\)/g;

  for (const file of htmlFiles) {
    const content = fsSync.readFileSync(file, 'utf-8');
    let m: RegExpExecArray | null;

    dotPattern.lastIndex = 0;
    while ((m = dotPattern.exec(content)) !== null) keys.add(m[1]);

    callPattern.lastIndex = 0;
    while ((m = callPattern.exec(content)) !== null) keys.add(m[1]);
  }

  for (const file of walkFiles(viewDir, ['.yaml', '.yml'])) {
    const content = fsSync.readFileSync(file, 'utf-8');
    let m: RegExpExecArray | null;
    yamlPattern.lastIndex = 0;
    while ((m = yamlPattern.exec(content)) !== null) keys.add(m[1]);
  }

  return keys;
}

/** Convert a flat dotted key like "login.idle.label" into a nested object. */
function setNestedKey(obj: Record<string, unknown>, dotKey: string, value: string): void {
  const parts = dotKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (cur[part] === undefined || typeof cur[part] !== 'object') {
      cur[part] = {};
    }
    cur = cur[part] as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1];
  // Don't clobber an existing value
  if (cur[leaf] === undefined) {
    cur[leaf] = value;
  }
}

/** Get a nested value by dotted key (returns undefined if missing). */
function getNestedKey(obj: Record<string, unknown>, dotKey: string): unknown {
  const parts = dotKey.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Produce a human-readable placeholder from the last segment of a dotted key. */
function placeholder(dotKey: string): string {
  const last = dotKey.split('.').at(-1) ?? dotKey;
  // Convert snake_case / camelCase to words
  return last.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim()
    .replace(/^\w/, c => c.toUpperCase());
}

/** Load a JSON or YAML i18n file (returns {} on error). */
function loadI18nFile(filePath: string): Record<string, unknown> {
  try {
    const content = fsSync.readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.json')) return JSON.parse(content) as Record<string, unknown>;
    return (YAML.parse(content) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

interface LocaleFile {
  filePath: string;
  locale: string;
  isJson: boolean;
  data: Record<string, unknown>;
}

/** Find all existing locale files under ux/i18n. */
function discoverLocaleFiles(i18nDir: string): LocaleFile[] {
  if (!fsSync.existsSync(i18nDir)) return [];
  const results: LocaleFile[] = [];

  for (const entry of fsSync.readdirSync(i18nDir, { withFileTypes: true })) {
    const localeEntry = path.join(i18nDir, entry.name);
    if (entry.isDirectory()) {
      // Per-locale directory, e.g. ux/i18n/en/
      for (const file of fsSync.readdirSync(localeEntry)) {
        if (!file.endsWith('.json') && !file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
        const fp = path.join(localeEntry, file);
        results.push({ filePath: fp, locale: entry.name, isJson: file.endsWith('.json'), data: loadI18nFile(fp) });
      }
    } else if (entry.name.endsWith('.json') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      // Flat file, e.g. ux/i18n/en.json
      const locale = path.basename(entry.name, path.extname(entry.name));
      results.push({ filePath: localeEntry, locale, isJson: entry.name.endsWith('.json'), data: loadI18nFile(localeEntry) });
    }
  }

  return results;
}

/** Serialize a nested object back to the file's format (JSON or YAML). */
function serializeI18n(data: Record<string, unknown>, isJson: boolean): string {
  if (isJson) return JSON.stringify(data, null, 2) + '\n';
  return YAML.stringify(data);
}

async function syncI18n(projectRoot: string, options: SyncOptions): Promise<string[]> {
  const written: string[] = [];
  const i18nDir = path.join(projectRoot, 'ux', 'i18n');

  const usedKeys = collectI18nKeyUsages(projectRoot);
  if (usedKeys.size === 0) return written;

  const localeFiles = discoverLocaleFiles(i18nDir);

  if (localeFiles.length === 0) {
    // No locale files yet — create a default en.json with all found keys
    const enFile = path.join(i18nDir, 'en.json');
    const data: Record<string, unknown> = {};
    for (const key of Array.from(usedKeys).sort()) {
      setNestedKey(data, key, placeholder(key));
    }
    if (options.dryRun) {
      console.log(`  [dry-run] ${enFile}`);
    } else {
      await fs.mkdir(i18nDir, { recursive: true });
      await fs.writeFile(enFile, serializeI18n(data, true), 'utf-8');
    }
    written.push(enFile);
    return written;
  }

  // For each existing locale file, add missing keys
  for (const localeFile of localeFiles) {
    let modified = false;
    for (const key of Array.from(usedKeys)) {
      if (getNestedKey(localeFile.data, key) !== undefined) continue;
      setNestedKey(localeFile.data, key, placeholder(key));
      modified = true;
    }
    if (!modified) continue;

    if (options.dryRun) {
      console.log(`  [dry-run] ${localeFile.filePath}`);
    } else {
      await fs.writeFile(localeFile.filePath, serializeI18n(localeFile.data, localeFile.isJson), 'utf-8');
    }
    written.push(localeFile.filePath);
  }

  return written;
}

// ---------------------------------------------------------------------------
// sync style — stub missing ux-style widget definitions
// ---------------------------------------------------------------------------

/** Collect all widget names referenced via ux-style="..." in HTML files. */
function collectUxStyleWidgets(projectRoot: string): Set<string> {
  const widgets = new Set<string>();
  const viewDir = path.join(projectRoot, 'ux', 'view');
  const layoutDir = path.join(projectRoot, 'ux', 'layout');
  const htmlFiles = [...walkFiles(viewDir, '.html'), ...walkFiles(layoutDir, '.html')];

  // ux-style="widget-name" or ux-style='widget-name'
  const pattern = /ux-style=["']([a-zA-Z0-9_-]+)["']/g;
  for (const file of htmlFiles) {
    const content = fsSync.readFileSync(file, 'utf-8');
    let m: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(content)) !== null) widgets.add(m[1]);
  }
  return widgets;
}

/** Find all widget names that already have a definition in ux/style/**. */
function collectDefinedWidgets(styleDir: string): Set<string> {
  const defined = new Set<string>();
  if (!fsSync.existsSync(styleDir)) return defined;
  for (const file of walkFiles(styleDir, ['.yaml', '.yml'])) {
    try {
      const data = (YAML.parse(fsSync.readFileSync(file, 'utf-8')) as Record<string, unknown>) ?? {};
      for (const key of Object.keys(data)) defined.add(key);
    } catch {
      // skip
    }
  }
  return defined;
}

function stubStyleYaml(widgetName: string): string {
  return `${widgetName}:
  base: ''
  # variants:
  #   variant:
  #     default: ''
  #     primary: ''
`;
}

async function syncStyle(projectRoot: string, options: SyncOptions): Promise<string[]> {
  const written: string[] = [];
  const styleDir = path.join(projectRoot, 'ux', 'style');
  const referencedWidgets = collectUxStyleWidgets(projectRoot);
  if (referencedWidgets.size === 0) return written;

  const definedWidgets = collectDefinedWidgets(styleDir);
  const missing = Array.from(referencedWidgets).filter(w => !definedWidgets.has(w)).sort();

  for (const widget of missing) {
    // Place new stubs in ux/style/compositions/ (consistent with existing pattern)
    const targetDir = path.join(styleDir, 'compositions');
    const targetPath = path.join(targetDir, `${widget}.yaml`);

    if (fsSync.existsSync(targetPath)) continue;

    if (options.dryRun) {
      console.log(`  [dry-run] ${targetPath}`);
    } else {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, stubStyleYaml(widget), 'utf-8');
    }
    written.push(targetPath);
  }

  return written;
}

// ---------------------------------------------------------------------------
// Command builders
// ---------------------------------------------------------------------------

function addCommonOptions(cmd: Command): Command {
  return cmd
    .option('--project <dir>', 'project root directory (default: auto-detect)')
    .option('--dry-run', 'print what would be written without writing');
}

function createSyncViewCommand(): Command {
  return addCommonOptions(
    new Command()
      .name('view')
      .description('Create stub HTML templates for FSM states that have no template file yet'),
  ).action(async (options: SyncOptions) => {
    const projectRoot = resolveProject(options);
    const written = await syncView(projectRoot, options);
    reportWritten(written, process.cwd(), options.dryRun ?? false, 'view');
  });
}

function createSyncI18nCommand(): Command {
  return addCommonOptions(
    new Command()
      .name('i18n')
      .description('Add missing i18n keys (referenced in templates) to existing locale files'),
  ).action(async (options: SyncOptions) => {
    const projectRoot = resolveProject(options);
    const written = await syncI18n(projectRoot, options);
    reportWritten(written, process.cwd(), options.dryRun ?? false, 'i18n');
  });
}

function createSyncStyleCommand(): Command {
  return addCommonOptions(
    new Command()
      .name('style')
      .description('Create stub style YAML for ux-style widgets that have no token definition yet'),
  ).action(async (options: SyncOptions) => {
    const projectRoot = resolveProject(options);
    const written = await syncStyle(projectRoot, options);
    reportWritten(written, process.cwd(), options.dryRun ?? false, 'style');
  });
}

function createSyncAllCommand(): Command {
  return addCommonOptions(
    new Command()
      .name('all')
      .description('Run all sync operations: hints, view, i18n, style'),
  ).action(async (options: SyncOptions) => {
    const projectRoot = resolveProject(options);
    const cwd = process.cwd();
    const dryRun = options.dryRun ?? false;

    const hintsWritten = await syncHints(projectRoot, { project: projectRoot, dryRun });
    reportWritten(hintsWritten, cwd, dryRun, 'hints');

    const viewWritten = await syncView(projectRoot, options);
    reportWritten(viewWritten, cwd, dryRun, 'view');

    const i18nWritten = await syncI18n(projectRoot, options);
    reportWritten(i18nWritten, cwd, dryRun, 'i18n');

    const styleWritten = await syncStyle(projectRoot, options);
    reportWritten(styleWritten, cwd, dryRun, 'style');
  });
}

export function createSyncCommand(): Command {
  const sync = new Command()
    .name('sync')
    .description('Sync scaffold defaults into your project without overwriting existing files');

  // Rename the existing hints command to be a subcommand: ux3 sync hints
  const hintsCmd = createHintsCommand().name('hints');
  sync.addCommand(hintsCmd);
  sync.addCommand(createSyncViewCommand());
  sync.addCommand(createSyncI18nCommand());
  sync.addCommand(createSyncStyleCommand());
  sync.addCommand(createSyncAllCommand());

  return sync;
}

export const syncCommand = createSyncCommand();

// Re-export the individual sync functions for testing
export { syncView, syncI18n, syncStyle };
