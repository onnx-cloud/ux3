/**
 * View Compiler - Converts ux/view/*.yaml + templates → generated/views/*.ts
 * Synthesizes FSM configs, layouts, templates, and bindings into ViewComponent classes
 */

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { BindingExtractor } from './binding-extractor.js';
import { MarkdownProcessor } from './markdown-processor.js';
import { defaultLogger } from '../security/observability.js';
import type { StateConfig } from '../fsm/types.js';

/**
 * Analyze template for fields, events, conditions, and repeats
 * Synchronous lightweight analyzer used by tests
 */
export function analyzeTemplate(html: string) {
  const fields = new Map<string, any>();
  const events = new Set<string>();

  // Match {{this.field}} interpolations
  const interpRegex = /\{\{this\.(\w+)(?:\.(\w+))?\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = interpRegex.exec(html)) !== null) {
    const fieldName = match[1];
    if (!fields.has(fieldName)) {
      fields.set(fieldName, { name: fieldName, type: 'any', optional: false });
    }
  }

  // Match ux-event="EVENT" patterns
  const eventRegex = /ux-event="(\w+)"/g;
  while ((match = eventRegex.exec(html)) !== null) {
    events.add(match[1]);
  }

  // Match ux-if="this.field" patterns
  const ifRegex = /ux-if="this\.(\w+)/g;
  while ((match = ifRegex.exec(html)) !== null) {
    const fieldName = match[1];
    if (!fields.has(fieldName)) {
      fields.set(fieldName, { name: fieldName, type: 'any', optional: true });
    }
  }

  // Match ux-repeat="this.field" or "namespace.field"
  const repeatRegex = /ux-repeat="(?:this\.)?(\w+(?:\.\w+)*)"/g;
  while ((match = repeatRegex.exec(html)) !== null) {
    const fullPath = match[1];
    const fieldName = fullPath.split('.').pop() || fullPath;
    if (!fields.has(fieldName)) {
      fields.set(fieldName, { name: fieldName, type: 'any[]', optional: false });
    }
  }

  return { fields: Array.from(fields.values()), events: Array.from(events) };
}

/**
 * Extract namespace (first segment) from dot-separated state name
 */
export function extractNamespace(state: string) {
  return state.split('.')[0];
}

/**
 * View YAML configuration
 */
export interface ViewConfig {
  name: string;
  fsm: string; // FSM machine name
  layout: string; // Layout HTML file
  states: Record<string, string>; // state → template HTML file mapping
  bindings?: {
    events?: Array<{ element: string; event: string; action: string }>;
    reactive?: Array<{ element: string; property: string; signal: string }>;
    i18n?: Array<{ element: string; key: string }>;
  };
}
// Manifest of referenced logic names collected during code generation
export interface LogicManifest {
  guards: Set<string>;
  actions: Set<string>;
  entry: Set<string>;
  exit: Set<string>;
  invokes: Set<string>;
}
/**
 * View Compiler - Generates ViewComponent classes from YAML + templates
 */
export class ViewCompiler {
  private srcDir: string;
  private destDir: string;
  private projectDir: string;
  private diagnostics: string[] = [];

  constructor(srcDir: string = './ux/view', destDir: string = './generated/views', projectDir?: string) {
    this.srcDir = srcDir;
    this.destDir = destDir;
    // If projectDir is not provided, derive it from srcDir (go up 2 levels from ux/view)
    this.projectDir = projectDir || path.resolve(path.dirname(path.dirname(srcDir)));
  }

  private toProjectRelativePath(targetPath: string): string {
    const rel = path.relative(this.projectDir, targetPath).split(path.sep).join('/');
    if (!rel || rel === '.') return './';
    return rel.startsWith('.') ? rel : `./${rel}`;
  }

  /**
   * Compile all views in directory
   */
  async compileAllViews(): Promise<void> {
    try {
      this.ensureDestDir();

      // Read all YAML files
      const viewFiles = this.findViewFiles();

      const generated: string[] = [];

      for (const file of viewFiles) {
        try {
          const viewName = path.basename(file, path.extname(file));
          const yaml = this.loadYAML(file);
          const code = await this.compileView(viewName, yaml);

          // Views named 'index' would collide with the barrel file; use 'index-view.ts'
          const outFileName = viewName === 'index' ? 'index-view' : viewName;
          const outFile = path.join(this.destDir, `${outFileName}.ts`);
          fs.writeFileSync(outFile, code);

          generated.push(viewName);
        } catch (error) {
          const msg = `Failed to compile view: ${file}: ${error}`;
          this.diagnostics.push(msg);
        }
      }

      // Generate index file
      this.generateIndex(generated);

      if (this.diagnostics.length > 0) {
        const diagnosticsMessage = this.diagnostics.join('\n');
        throw new Error(diagnosticsMessage);
      }
    } catch (error) {
      throw error;
    }
  }


  /**
   * Compile a single view
   */
  private async compileView(viewName: string, yaml: any): Promise<string> {
    // parse and prepare data early
    const parsed: any = yaml || {};
    const fsmName = parsed.fsm || viewName;
    const layoutName = parsed.layout || `${viewName}-layout`;
    const stateConfigs = parsed.states || {};

    // Load layout HTML - layouts live in ux/layout/, not ux/view/
    const layoutDir = path.join(this.srcDir, '..', 'layout');
    const layoutPath = path.join(layoutDir, `${layoutName}.html`);
    const fallbackLayoutPath = path.join(layoutDir, '_.html');
    const hasDeclaredLayout = typeof parsed.layout === 'string' && parsed.layout.trim().length > 0;
    let layout = '';
    
    if (fs.existsSync(layoutPath)) {
      layout = fs.readFileSync(layoutPath, 'utf-8');
    } else if (hasDeclaredLayout) {
      const msg = `Layout '${layoutName}' not found: ${this.toProjectRelativePath(layoutPath)}`;
      throw new Error(msg);
    } else if (fs.existsSync(fallbackLayoutPath)) {
      layout = fs.readFileSync(fallbackLayoutPath, 'utf-8');
    } else {
      const msg = `Layout '${layoutName}' not found: ${this.toProjectRelativePath(layoutPath)}`;
      throw new Error(msg);
    }

    // Load state templates (supports both short-form and long-form state definitions)
    const templates: Record<string, string> = {};

    // Helper to read a template file safely
    // relPath is either absolute (starting with 'view/') or relative to srcDir
    const loadTemplateFile = (state: string, relPath: string) => {
      // If the path starts with 'view/', resolve it relative to ux/ (parent of srcDir)
      let templatePath: string;
      if (relPath.startsWith('view/')) {
        templatePath = path.join(this.srcDir, '..', relPath);
      } else {
        templatePath = path.join(this.srcDir, relPath);
      }

      try {
        const st = fs.statSync(templatePath);
        if (!st.isFile()) {
          this.diagnostics.push(`Template path is not a file: ${templatePath} (for state ${state})`);
          return null;
        }
      } catch (e) {
        this.diagnostics.push(`Template not found: ${templatePath} (for state ${state})`);
        return null;
      }

      return fs.readFileSync(templatePath, 'utf-8');
    };

    const parsedStates = (parsed && parsed.states) || {};

    const shouldResolveTemplate = (raw: any): boolean => {
      if (typeof raw === 'string') return true;
      if (!raw || typeof raw !== 'object') return false;
      if (typeof raw.template === 'string') return true;
      return !raw.invoke && !raw.src;
    };

    // First, handle long-form/parsed states
    for (const [state, raw] of Object.entries(parsedStates)) {
      if (typeof raw === 'string') {
        const content = loadTemplateFile(state, raw);
        if (content !== null) templates[state] = content;
      } else if (raw && typeof raw === 'object') {
        if (typeof (raw as any).template === 'string') {
          const content = loadTemplateFile(state, (raw as any).template);
          if (content !== null) templates[state] = content;
        } else if (raw.invoke || raw.src) {
          // Transitional states with invoke-only behavior may render no template.
          continue;
        } else {
          // Try common fallback locations inside a view directory: <viewName>/<state>.html or <viewName>/<state>/index.html
          const candidates = [
            path.join(viewName, `${state}.html`),
            path.join(viewName, state, 'index.html'),
            `${viewName}-${state}.html`,
            `${state}.html`,
          ];

          for (const cand of candidates) {
            const content = loadTemplateFile(state, cand);
            if (content !== null) {
              templates[state] = content;
              break;
            }
          }
        }
      }
    }

    // Auto-resolve templates for states defined in FSM but missing in View YAML
    if (parsed && parsed.fsm && parsed.fsm.states) {
      for (const state of Object.keys(parsed.fsm.states)) {
        if (templates[state]) continue;
        const stateDef = parsed.fsm.states[state];
        if (stateDef && typeof stateDef === 'object' && !('template' in stateDef) && (stateDef.invoke || stateDef.src)) {
          continue;
        }

        const candidates = [
          path.join(viewName, `${state}.html`),
          path.join(viewName, state, 'index.html'),
          `${viewName}-${state}.html`,
        ];
        for (const cand of candidates) {
          const content = loadTemplateFile(state, cand);
          if (content !== null) {
            templates[state] = content;
            break;
          }
        }
      }
    }

    // Then, handle short-form mappings produced by loadYAML (if any)
    for (const [state, file] of Object.entries(stateConfigs)) {
      if (templates[state]) continue; // already loaded via parsed long-form
      if (typeof file === 'string') {
        const content = loadTemplateFile(state, file);
        if (content !== null) templates[state] = content;
      }
    }

    // Validation: warn if no templates were loaded for defined states
    const statesRequiringTemplates = Object.entries(stateConfigs)
      .filter(([_, raw]) => shouldResolveTemplate(raw))
      .map(([state]) => state);

    if (statesRequiringTemplates.length > 0 && Object.keys(templates).length === 0) {
      this.diagnostics.push(
        `[ViewCompiler] WARNING: ${viewName} has ${statesRequiringTemplates.length} render states defined but no templates were loaded: ${statesRequiringTemplates.join(', ')}`
      );
    }

    // Validation: warn if layout is empty
    if (!layout) {
      this.diagnostics.push(`[ViewCompiler] WARNING: ${viewName} has no layout HTML. This view will not render properly.`);
    }

    // Process markdown tags in templates and layout (if contained)
    // Only instantiate processor if templates or layout contain ux-markdown tags
    const hasMarkdownTags = Object.values(templates).some(t => t.includes('<ux-markdown')) || 
                           (layout && layout.includes('<ux-markdown'));
    
    if (hasMarkdownTags) {
      const mdProcessor = new MarkdownProcessor({
        projectDir: this.projectDir,
        strictMode: false,
        sanitizationLevel: 'moderate',
      });

      // Process all templates, using projectDir as the base for relative paths
      for (const [state, html] of Object.entries(templates)) {
        if (html.includes('<ux-markdown')) {
          templates[state] = mdProcessor.processTemplate(html, this.projectDir, 'en');
        }
      }

      // Process layout if it exists and contains markdown tags
      if (layout && layout.includes('<ux-markdown')) {
        layout = mdProcessor.processTemplate(layout, this.projectDir, 'en');
      }

      // Report any markdown processing diagnostics
      const mdDiags = mdProcessor.getDiagnostics();
      if (mdDiags.length > 0) {
        this.diagnostics.push(...mdDiags.map(d => `[MarkdownProcessor] ${d}`));
      }
    }

    // Extract bindings
    const allBindings = {
      events: [] as any[],
      reactive: [] as any[],
      i18n: [] as any[],
      widgets: [] as any[],
    };

    for (const [state, html] of Object.entries(templates)) {
      const extractor = new BindingExtractor(html);
      const bindings = extractor.extractAll();

      allBindings.events.push(
        ...bindings.events.map((b) => ({ ...b, state }))
      );
      allBindings.reactive.push(
        ...bindings.reactive.map((b) => ({ ...b, state }))
      );
      allBindings.i18n.push(
        ...bindings.i18n.map((b) => ({ ...b, state }))
      );
      allBindings.widgets.push(
        ...bindings.widgets.map((b) => ({ ...b, state }))
      );
    }

    // At this point parsed already contains the full YAML parsed by loadYAML

    // Generate .types.ts file with best-effort context typing
    const typesCode = this.generateViewTypes(viewName, parsed?.fsm?.context || parsed?.context || {}, allBindings);
    try {
      fs.writeFileSync(path.join(this.destDir, `${viewName}.types.ts`), typesCode);
    } catch (e) {
      this.diagnostics.push(`Failed to write types for ${viewName}: ${e}`);
    }

    // helper to parse exported symbol names from a TS/JS file
    const parseExports = (file: string): Set<string> => {
      const text = fs.readFileSync(file, 'utf-8');
      const names = new Set<string>();
      const re1 = /export\s+(?:function|const|let|var|class)\s+([A-Za-z0-9_]+)/g;
      let m1: RegExpExecArray | null;
      while ((m1 = re1.exec(text))) {
        names.add(m1[1]);
      }
      const re2 = /export\s*\{([^}]+)\}/g;
      let m2: RegExpExecArray | null;
      while ((m2 = re2.exec(text))) {
        m2[1].split(',').forEach((part) => {
          const n = part.split(' as ')[0].trim();
          if (n) names.add(n);
        });
      }
      return names;
    };

    // detect whether a logic module exists for this view
    // logic modules live alongside view definitions under ux/logic
    // srcDir is typically './ux/view', so '../logic' resolves to './ux/logic'
    const logicPath = path.join(this.srcDir, '..', 'logic', `${viewName}.ts`);
    const logicExists = fs.existsSync(path.resolve(logicPath));

    // build a manifest to collect referenced logic names
    const manifest: LogicManifest = {
      guards: new Set(),
      actions: new Set(),
      entry: new Set(),
      exit: new Set(),
      invokes: new Set(),
    };

    // Determine FSM configuration: prefer explicit 'fsm' object, otherwise
    // treat the entire YAML as inline FSM config (tests use this layout).
    const fsmConfig = parsed.fsm ? parsed.fsm : parsed;

    // Generate TypeScript code, passing manifest to be populated
    const code = this.generateViewComponent(
      viewName,
      fsmName,
      layoutName,
      layout,
      templates,
      allBindings,
      fsmConfig,
      logicExists,
      manifest
    );

    // write manifest JSON
    const manifestObj = {
      guards: Array.from(manifest.guards),
      actions: Array.from(manifest.actions),
      entry: Array.from(manifest.entry),
      exit: Array.from(manifest.exit),
      invokes: Array.from(manifest.invokes),
    };
    try {
      fs.writeFileSync(
        path.join(this.destDir, `${viewName}.logic.json`),
        JSON.stringify(manifestObj, null, 2)
      );
    } catch (e) {
      this.diagnostics.push(`Failed to write logic manifest for ${viewName}: ${e}`);
    }

    // diagnostics: missing logic module or missing functions
    if (!logicExists) {
      const sharedPath = path.join(this.srcDir, '..', 'logic', 'shared.ts');
      const sharedExports = fs.existsSync(sharedPath) ? parseExports(sharedPath) : new Set<string>();

      const missingRefs: string[] = [];
      const allRefs = [
        ...manifest.guards,
        ...manifest.actions,
        ...manifest.entry,
        ...manifest.exit,
        ...manifest.invokes,
      ];

      for (const ref of allRefs) {
        if (!sharedExports.has(ref)) {
          missingRefs.push(ref);
        }
      }

      if (missingRefs.length > 0) {
        this.diagnostics.push(
          `[ViewCompiler] ${viewName} references logic names (${missingRefs.join(', ')}) but no ux/logic/${viewName}.ts module was found and they are not exported from shared.ts`
        );
      }
    } else {
      // verify that referenced names exist in logic or shared by parsing files
      try {
        const logicExports = parseExports(path.resolve(logicPath));
        const sharedPath = path.join(this.srcDir, '..', 'logic', 'shared.ts');
        const sharedExports = fs.existsSync(sharedPath) ? parseExports(sharedPath) : new Set<string>();
        const checkSet = (set: Set<string>, type: string) => {
          set.forEach((name) => {
            if (!logicExports.has(name) && !sharedExports.has(name)) {
              this.diagnostics.push(
                `[ViewCompiler] ${viewName} references ${type} '${name}' but it's not exported by ux/logic/${viewName}.ts or shared.ts`
              );
            }
          });
        };
        checkSet(manifest.guards, 'guard');
        checkSet(manifest.actions, 'action');
        checkSet(manifest.entry, 'entry');
        checkSet(manifest.exit, 'exit');
        checkSet(manifest.invokes, 'invoke');
      } catch (e) {
        // parsing failed, ignore
      }
    }

    return code;
  }

  /**
   * Generate ViewComponent TypeScript code
   */
  private generateViewComponent(
    viewName: string,
    fsmName: string,
    layoutName: string,
    layout: string,
    templates: Record<string, string>,
    bindings: any,
    fsmConfig: any = {},
    logicExists: boolean = false,
    manifest?: LogicManifest
  ): string {
    const className = this.toPascalCase(viewName) + 'View';
    const escapedLayout = this.escapeString(layout);

    // ensure we have a manifest object (may be passed by reference from caller)
    if (!manifest) {
      manifest = {
        guards: new Set(),
        actions: new Set(),
        entry: new Set(),
        exit: new Set(),
        invokes: new Set(),
      };
    }

    // build logic import path relative to generated/views output
    // assume views are emitted under '<root>/generated/views', so import path should be '../../ux/logic'
    const logicImportPath = '../../ux/logic/' + viewName;

    // helper to convert config object into JS code with logic references
    const stringifyConfig = (obj: any, depth = 2): string => {
      if (Array.isArray(obj)) {
        const items = obj.map((v) => stringifyConfig(v, depth + 2));
        return `[
${items.join(',\n')}
${' '.repeat(depth)}]`;
      }
      if (obj && typeof obj === 'object') {
        const entries: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          let valCode: string;
          const checkRef = (name: string, type: 'guard' | 'actions' | 'entry' | 'exit' | 'src') => {
            if (name) {
              manifest[type === 'actions' ? 'actions' : type === 'entry' ? 'entry' : type === 'exit' ? 'exit' : type === 'guard' ? 'guards' : 'invokes'].add(name);
              // warn if function doesn't exist in logic or shared later (resolve when generating)
            }
          };

          // Helper to generate reference with proper fallback
          // If logicExists is true, use (logic.name || shared.name)
          // Otherwise, use just shared.name
          const makeRef = (name: string): string => {
            if (logicExists) {
              return `(logic.${name} || shared.${name})`;
            } else {
              return `shared.${name}`;
            }
          };

          if ((k === 'guard' || k === 'src') && typeof v === 'string') {
            checkRef(v, k === 'guard' ? 'guard' : 'src');
            valCode = makeRef(v);
          } else if (k === 'actions' && Array.isArray(v)) {
            v.forEach((n: string) => checkRef(n, 'actions'));
            valCode = `[${v
              .map((n: string) => makeRef(n))
              .join(', ')}]`;
          } else if ((k === 'entry' || k === 'exit') && typeof v === 'string') {
            checkRef(v, k);
            valCode = makeRef(v);
          } else if ((k === 'entry' || k === 'exit') && Array.isArray(v)) {
            v.forEach((n: string) => checkRef(n, k));
            valCode = `[${v
              .map((n: string) => makeRef(n))
              .join(', ')}]`;
          } else {
            valCode = stringifyConfig(v, depth + 2);
          }
          entries.push(`${' '.repeat(depth)}${JSON.stringify(k)}: ${valCode}`);
        }
        return `{
${entries.join(',\n')}
${' '.repeat(depth - 2)}}`;
      }
      if (typeof obj === 'string') {
        return JSON.stringify(obj);
      }
      return String(obj);
    };

    const configCode = stringifyConfig(fsmConfig, 2);

    const templateCode = Object.entries(templates)
      .map(
        ([state, html]) =>
          `    [${JSON.stringify(state)}, ${this.escapeString(html)}],`
      )
      .join('\n');

    const code = `
/**
 * Auto-generated ViewComponent
 * DO NOT EDIT MANUALLY
 * Generated by ViewCompiler from ${viewName}
 */

import { ViewComponent } from '@ux3/ui';
import type { StateConfig } from '../fsm/types.js';
// logic helpers (view-specific + shared)
${logicExists ? `import * as logic from '${logicImportPath}';` : ''}
import * as shared from '../../../ux/logic/shared';

/**
 * ${className} - ${viewName} view component
 * FSM: ${fsmName}
 * Layout: ${layoutName}
 * States: ${Object.keys(templates).join(', ')}
 */
export class ${className} extends ViewComponent {
  static FSM_CONFIG: StateConfig<any> = ${configCode};

  protected layout = ${escapedLayout};

  protected templates = new Map([
${templateCode}
  ]);

  protected bindings = {
    events: ${JSON.stringify(bindings.events, null, 4)},
    reactive: ${JSON.stringify(bindings.reactive, null, 4)},
    i18n: ${JSON.stringify(bindings.i18n, null, 4)},
    widgets: ${JSON.stringify(bindings.widgets, null, 4)},
  };
}

// Register component with guard to avoid duplicate-define errors
if (typeof customElements !== 'undefined') {
  const tag = 'ux-${this.toKebabCase(viewName)}';
  if (!customElements.get(tag)) {
    customElements.define(tag, ${className});
  }
}

export default ${className};
`.trim();

    return code;
  }

  /**
   * Generate index file for all views
   */
  private generateIndex(viewNames: string[]): void {
    const imports = viewNames
      .map((name) => {
        const className = this.toPascalCase(name);
        // 'index' view is generated as 'index-view.ts' to avoid colliding with this barrel
        const fileName = name === 'index' ? 'index-view' : name;
        return `import { ${className}View } from './${fileName}.js';`;
      })
      .join('\n');

    const exports = viewNames
      .map((name) => {
        const className = this.toPascalCase(name);
        return `  '${name}': ${className}View,`;
      })
      .join('\n');

    const index = `
/**
 * Auto-generated Views Index
 * DO NOT EDIT MANUALLY
 * Generated by ViewCompiler
 */

${imports}

/**
 * View Registry
 * Maps view names to their ViewComponent classes
 */
export const Views = {
${exports}
};

export default Views;
`.trim();

    fs.writeFileSync(path.join(this.destDir, 'index.ts'), index);
  }

  /**
   * Find all view YAML files
   */
  private findViewFiles(): string[] {
    const files: string[] = [];

    if (!fs.existsSync(this.srcDir)) {
      defaultLogger.warn(`[ViewCompiler] Source directory not found: ${this.srcDir}`);
      return files;
    }

    // recursive walk to collect any .yaml under srcDir
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
          files.push(full);
        }
      }
    };
    walk(this.srcDir);

    return files;
  }

  /**
   * Load YAML file (simple parser)
   */
  private loadYAML(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      return YAML.parse(content) || {};
    } catch (e) {
      this.diagnostics.push(`[ViewCompiler] failed to parse YAML ${filePath}: ${e}`);
      return {};
    }
  }

  /**
   * Ensure destination directory exists
   */
  private ensureDestDir(): void {
    if (!fs.existsSync(this.destDir)) {
      fs.mkdirSync(this.destDir, { recursive: true });
    }
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Escape string for JavaScript code
   */
  private escapeString(str: string): string {
    return (
      '`' +
      str
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$') +
      '`'
    );
  }

  /**
   * Generate `.types.ts` content for a view
   */
  private generateViewTypes(viewName: string, context: Record<string, any>, bindings: any): string {
    const interfaceName = `${this.toPascalCase(viewName)}Context`;

    // Start with context keys if available
    const lines: string[] = [];
    lines.push(`export interface ${interfaceName} {`);

    if (context && Object.keys(context).length > 0) {
      for (const [k, v] of Object.entries(context)) {
        const t = typeof v === 'object' ? 'any' : typeof v;
        lines.push(`  ${k}?: ${t};`);
      }
    }

    // Add reactive binding roots as optional any props
    const reactiveRoots = new Set<string>();
    for (const r of bindings.reactive || []) {
      const root = String(r.signal).split(/\.|\[/)[0];
      if (!context || !Object.prototype.hasOwnProperty.call(context, root)) {
        reactiveRoots.add(root);
      }
    }

    for (const r of reactiveRoots) {
      lines.push(`  ${r}?: any;`);
    }

    lines.push('}');

    lines.push('');
    lines.push(`export type ${this.toPascalCase(viewName)}Types = { context: ${interfaceName} }`);

    return lines.join('\n');
  }

  /**
   * Get compilation diagnostics
   */
  getDiagnostics(): string[] {
    return [...this.diagnostics];
  }
}

// Convenience helper for simple CLI use
export async function compileAllViews(srcDir: string, destDir: string, projectDir?: string): Promise<void> {
  const vc = new ViewCompiler(srcDir, destDir, projectDir);
  await vc.compileAllViews();
}

