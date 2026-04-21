import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILT_IN_TEMPLATES_DIR = path.resolve(__dirname, 'templates');

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface ScaffoldContext {
  /** raw kebab-case slug (e.g. "my-view") */
  name: string;
  /** PascalCase (e.g. "MyView") */
  Name: string;
  /** snake_case (e.g. "my_view") */
  name_snake: string;
  /** UPPER_SNAKE (e.g. "MY_VIEW") */
  NAME: string;
  /** Current year */
  year: string;
  /** ISO date */
  date: string;
  /** Installed UX3 version */
  ux3Version: string;
  [key: string]: string;
}

/** Derive casing variants from a raw name string. */
function deriveCasings(raw: string): Pick<ScaffoldContext, 'name' | 'Name' | 'name_snake' | 'NAME'> {
  // normalise to kebab
  const kebab = raw
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

  const parts = kebab.split('-').filter(Boolean);
  const Name = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  const name_snake = parts.join('_');
  const NAME = parts.join('_').toUpperCase();

  return { name: kebab, Name, name_snake, NAME };
}

/** Read the ux3 version from the framework's own package.json. */
function readUx3Version(): string {
  try {
    // Walk up from __dirname to find the framework root package.json
    let dir = path.resolve(__dirname, '../..');
    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(dir, 'package.json');
      if (fsSync.existsSync(pkgPath)) {
        const pkg = JSON.parse(fsSync.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name && (pkg.name === 'ux3' || pkg.name?.startsWith('@ux3'))) {
          return pkg.version ?? '0.1.0';
        }
      }
      dir = path.dirname(dir);
    }
  } catch {
    // ignore
  }
  return '0.1.0';
}

/**
 * Build a ScaffoldContext from a raw name argument plus optional extra tokens.
 */
export function buildContext(raw: string, extra?: Record<string, string>): ScaffoldContext {
  const now = new Date();
  return {
    ...deriveCasings(raw),
    year: String(now.getFullYear()),
    date: now.toISOString().slice(0, 10),
    ux3Version: readUx3Version(),
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/**
 * Replace [[ TOKEN ]] placeholders with values from ctx.
 * Leaves {{ }} entirely untouched (UX3 runtime syntax).
 */
export function interpolate(template: string, ctx: ScaffoldContext): string {
  return template.replace(/\[\[\s*([\w.]+)\s*\]\]/g, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(ctx, key) ? ctx[key] : `[[${key}]]`;
  });
}

/**
 * Interpolate [[ ]] tokens inside a file-system path string.
 */
export function interpolatePath(p: string, ctx: ScaffoldContext): string {
  return interpolate(p, ctx);
}

// ---------------------------------------------------------------------------
// Template loading
// ---------------------------------------------------------------------------

/**
 * Return the directory for a given section's templates.
 * User overrides in <projectRoot>/.ux3/templates/<section>/ take precedence.
 */
export function resolveTemplateDir(section: string, projectRoot?: string): string {
  if (projectRoot) {
    const override = path.join(projectRoot, '.ux3', 'templates', section);
    if (fsSync.existsSync(override)) return override;
  }
  return path.join(BUILT_IN_TEMPLATES_DIR, section);
}

/**
 * Load a single template file's contents.
 * Resolves user overrides before falling back to built-ins.
 */
export async function loadTemplate(
  section: string,
  file: string,
  projectRoot?: string
): Promise<string> {
  const templateDir = resolveTemplateDir(section, projectRoot);
  const filePath = path.join(templateDir, file);
  return fs.readFile(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// Scaffold emission
// ---------------------------------------------------------------------------

export interface EmitOptions {
  /** Print files without writing them */
  dryRun?: boolean;
  /** Overwrite files that already exist */
  force?: boolean;
}

/**
 * Recursively list all files under a directory (relative paths).
 */
async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'SPEC.md') continue; // never emit SPECs into user projects
    if (entry.isDirectory()) {
      const sub = await listFiles(path.join(dir, entry.name));
      for (const f of sub) result.push(path.join(entry.name, f));
    } else {
      result.push(entry.name);
    }
  }
  return result;
}

/**
 * Emit all files from a section's template directory into targetDir,
 * interpolating both file-name paths and file content.
 *
 * Returns the list of file paths that were written (or would be written on dry-run).
 */
export async function emitScaffold(
  section: string,
  ctx: ScaffoldContext,
  targetDir: string,
  options: EmitOptions = {},
  projectRoot?: string
): Promise<string[]> {
  const templateDir = resolveTemplateDir(section, projectRoot);

  if (!fsSync.existsSync(templateDir)) {
    throw new Error(`No template directory found for section "${section}" at ${templateDir}`);
  }

  const templateFiles = await listFiles(templateDir);
  const written: string[] = [];

  for (const relTemplatePath of templateFiles) {
    // Interpolate path tokens in the file name/subpath
    const relOutputPath = interpolatePath(relTemplatePath, ctx);
    const outputPath = path.join(targetDir, relOutputPath);

    if (!options.force && !options.dryRun && fsSync.existsSync(outputPath)) {
      continue; // skip existing files unless --force
    }

    const rawContent = await fs.readFile(path.join(templateDir, relTemplatePath), 'utf-8');
    const content = interpolate(rawContent, ctx);

    if (options.dryRun) {
      console.log(`  [dry-run] ${outputPath}`);
    } else {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content, 'utf-8');
    }

    written.push(outputPath);
  }

  return written;
}
