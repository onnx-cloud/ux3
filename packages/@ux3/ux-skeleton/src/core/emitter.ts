import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import type { FileFilter, PathTransformer, ScaffoldEvent, ScaffoldContext } from '../types.js';
import { interpolate, interpolatePath } from './interpolator.js';

/**
 * Recursively list all files under a directory (relative paths).
 */
async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sub = await listFiles(path.join(dir, entry.name));
      for (const f of sub) result.push(path.join(entry.name, f));
    } else {
      result.push(entry.name);
    }
  }
  return result;
}

export interface EmitOptions {
  force?: boolean;
  dryRun?: boolean;
  fileFilter?: FileFilter;
  pathTransformer?: PathTransformer;
}

/**
 * Emit all files from a template directory into target directory.
 * Applies interpolation to both file paths and file content.
 * Returns written files and events.
 */
export async function emitFiles(
  templateDir: string,
  ctx: ScaffoldContext,
  targetDir: string,
  options: EmitOptions = {}
): Promise<{ written: string[]; skipped: string[]; events: ScaffoldEvent[] }> {
  const written: string[] = [];
  const skipped: string[] = [];
  const events: ScaffoldEvent[] = [];

  const fileFilter = options.fileFilter;
  const pathTransformer = options.pathTransformer;

  if (!fsSync.existsSync(templateDir)) {
    const error = new Error(`Template directory not found: ${templateDir}`);
    events.push({
      type: 'template-error',
      error,
    });
    throw error;
  }

  const templateFiles = await listFiles(templateDir);

  for (const relTemplatePath of templateFiles) {
    // Apply file filter
    if (fileFilter && !fileFilter(relTemplatePath)) {
      skipped.push(relTemplatePath);
      events.push({
        type: 'file-skipped',
        file: relTemplatePath,
        reason: 'filtered',
      });
      continue;
    }

    // Interpolate path
    let relOutputPath = interpolatePath(relTemplatePath, ctx);

    // Apply path transformer
    if (pathTransformer) {
      relOutputPath = pathTransformer(relOutputPath);
    }

    const outputPath = path.join(targetDir, relOutputPath);

    // Check if file exists and skip unless force
    if (!options.force && !options.dryRun && fsSync.existsSync(outputPath)) {
      skipped.push(relOutputPath);
      events.push({
        type: 'file-skipped',
        file: relOutputPath,
        reason: 'exists',
      });
      continue;
    }

    try {
      // Read template and interpolate content
      const templatePath = path.join(templateDir, relTemplatePath);
      const rawContent = await fs.readFile(templatePath, 'utf-8');
      const content = interpolate(rawContent, ctx);

      // Write file
      if (!options.dryRun) {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content, 'utf-8');
      }

      written.push(relOutputPath);
      events.push({
        type: 'file-written',
        file: relOutputPath,
      });
    } catch (error) {
      events.push({
        type: 'file-error',
        file: relOutputPath,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  return { written, skipped, events };
}
