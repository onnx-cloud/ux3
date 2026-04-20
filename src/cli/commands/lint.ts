import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Validator } from '../../build/validator.js';
import { lintLogicModules } from '../logic-lint.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../');

function loadSchemas() {
  const schemasDir = path.join(rootDir, 'schema');
  const schemas: Record<string, any> = {};
  const schemaFiles = ['routes', 'services', 'i18n', 'style', 'tokens', 'validate', 'view', 'content'];

  for (const file of schemaFiles) {
    const schemaPath = path.join(schemasDir, `${file}.schema.json`);
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      schemas[file] = JSON.parse(content);
    }
  }

  return schemas;
}

type LintOptions = {
  strict?: boolean;
  logic?: boolean;
};

function toRelativePath(projectDir: string, filePath: string): string {
  const rel = path.relative(projectDir, filePath).split(path.sep).join('/');
  if (!rel || rel === '.') return './';
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function normalizeLintMessage(projectDir: string, message: string): string {
  let normalized = message.replace(/\[ViewCompiler\]\s*/g, '').trim();

  normalized = normalized.replace(
    /Declared layout '([^']+)' not found at\s+(.+)$/,
    (_m, layout, absPath) => `Layout '${layout}' not found: ${toRelativePath(projectDir, String(absPath).trim())}`
  );

  normalized = normalized.replace(
    /Layout '([^']+)' not found\. Checked:\s*([^,]+),.*$/,
    (_m, layout, firstPath) => `Layout '${layout}' not found: ${toRelativePath(projectDir, String(firstPath).trim())}`
  );

  return normalized;
}

function expandMessageLines(projectDir: string, message: string): string[] {
  const normalized = normalizeLintMessage(projectDir, message);
  return normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function parseFailedViewLine(line: string): { viewFile: string; detail: string } | null {
  const match = line.match(/^Failed to compile view:\s+(.+?):\s*(?:Error:\s*)?(.+)$/);
  if (!match) return null;
  return {
    viewFile: match[1].trim(),
    detail: match[2].trim(),
  };
}

async function runLint(projectDir: string, options: LintOptions): Promise<void> {
  const schemas = loadSchemas();
  const strict = Boolean(options.strict);
  const uxDir = path.join(projectDir, 'ux');

  if (!fs.existsSync(uxDir)) {
    console.error('missing required directory: ./ux');
    process.exit(1);
  }

  const validator = new Validator({
    projectDir,
    schemas,
    failOnWarnings: strict,
  });

  const validation = await validator.validate();

  if ((validation.warnings || []).length > 0) {
    console.warn(`warnings: ${validation.warnings!.length}`);
    for (const warning of validation.warnings!) {
      const filePath = toRelativePath(projectDir, warning.file);
      const location = warning.line ? `${filePath}:${warning.line}` : filePath;
      const message = normalizeLintMessage(projectDir, warning.message);
      console.warn(`${location}: ${message}`);
      if (warning.suggestion) {
        console.warn(`hint: ${warning.suggestion}`);
      }
    }
  }

  if (!validation.valid) {
    const viewErrors = new Map<string, string[]>();
    const otherErrors: string[] = [];

    for (const error of validation.errors) {
      const lines = expandMessageLines(projectDir, error.message);
      for (const line of lines) {
        const parsed = parseFailedViewLine(line);
        if (parsed) {
          const list = viewErrors.get(parsed.viewFile) || [];
          if (!list.includes(parsed.detail)) {
            list.push(parsed.detail);
          }
          viewErrors.set(parsed.viewFile, list);
          continue;
        }

        const filePath = toRelativePath(projectDir, error.file);
        const location = error.line ? `${filePath}:${error.line}` : filePath;
        otherErrors.push(`${location}: ${line}`);
      }

      if (error.suggestion) {
        otherErrors.push(`hint: ${error.suggestion}`);
      }
    }

    for (const [viewFile, issues] of viewErrors.entries()) {
      console.error(`Failed to compile view: ${viewFile}:`);
      for (const issue of issues) {
        console.error(`  - ${issue}`);
      }
    }

    for (const line of otherErrors) {
      console.error(line);
    }

    process.exit(1);
  }

  if (options.logic) {
    const logicDir = path.join(projectDir, 'ux', 'logic');
    const viewsDir = path.join(projectDir, 'ux', 'view');
    const issues = lintLogicModules({ logicDir, viewsDir });
    if (issues > 0) {
      console.error(`errors: ${issues}`);
      console.error(`./ux/logic: unused logic export(s) detected`);
      process.exit(1);
    }
  }
}

export const lintCommand = new Command()
  .name('lint')
  .description('Lint project configuration, views, and code quality checks')
  .option('--strict, -s', 'treat warnings as errors')
  .option('--logic', 'lint ux/logic modules for unused exports', false)
  .action(async (options: LintOptions) => {
    try {
      await runLint(process.cwd(), options);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Backwards-compatible alias while transitioning from `check` to `lint`.
export const checkCommand = new Command()
  .name('check')
  .description('Deprecated alias for `ux3 lint`')
  .option('--strict, -s', 'treat warnings as errors')
  .option('--logic', 'lint ux/logic modules for unused exports', false)
  .action(async (options: LintOptions) => {
    console.warn('`ux3 check` is deprecated; use `ux3 lint`.');
    try {
      await runLint(process.cwd(), options);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
