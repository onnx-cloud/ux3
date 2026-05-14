import type { CasingStrategy, ContextProvider, FileFilter, PathTransformer, ScaffoldContext } from '../types.js';
import * as fsSync from 'fs';
import * as path from 'path';

import { HINTS_FILENAME } from '@ux3/constants';

// ===== Casing Strategy =====

/**
 * Default casing strategy: kebab, PascalCase, snake_case, UPPER_SNAKE.
 */
export const defaultCasingStrategy: CasingStrategy = (raw: string) => {
  // Normalize to kebab case
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
};

// ===== Context Provider =====

/**
 * Default context provider: adds metadata but no custom tokens.
 */
export const defaultContextProvider: ContextProvider = (base: ScaffoldContext) => base;

/**
 * Read UX3 version from framework package.json.
 */
export function readUx3Version(): string {
  try {
    let dir = process.cwd();
    // Walk up to find the UX3 framework root
    for (let i = 0; i < 10; i++) {
      const pkgPath = path.join(dir, 'package.json');
      if (fsSync.existsSync(pkgPath)) {
        const pkg = JSON.parse(fsSync.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'ux3' || pkg.name?.startsWith('@ux3')) {
          return pkg.version ?? 'unknown';
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch (e) {
    // Silently fail; we'll use 'unknown'
  }
  return 'unknown';
}

// ===== File Filter =====

/**
 * Default file filter: skip HINTS.md files (documentation, not user code).
 */
export const defaultFileFilter: FileFilter = (filePath: string) => {
  return !filePath.includes(HINTS_FILENAME);
};

// ===== Path Transformer =====

/**
 * Identity path transformer: no transformation.
 */
export const defaultPathTransformer: PathTransformer = (p: string) => p;
