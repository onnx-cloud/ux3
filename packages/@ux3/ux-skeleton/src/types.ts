import { fileURLToPath } from 'url';
import * as path from 'path';

/**
 * Context provided to template interpolation.
 * Includes casing variants, metadata, and custom tokens.
 */
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
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Installed UX3 version */
  ux3Version: string;
  [key: string]: string;
}

/**
 * Configuration for a scaffolding operation.
 */
export interface ScaffoldConfig {
  /** Template section (e.g. "view", "plugin", "service") */
  section: string;
  /** Name for the artifact being scaffolded (e.g. "my-view") */
  name: string;
  /** Target directory where files will be written */
  targetDir: string;
  /** Project root for resolving overrides */
  projectRoot?: string;
  /** Print files without writing them */
  dryRun?: boolean;
  /** Overwrite files that already exist */
  force?: boolean;
  /** Pluggable strategies for customization */
  strategies?: Partial<StrategyMap>;
}

/**
 * Event emitted during scaffolding for observability.
 */
export interface ScaffoldEvent {
  type: 'file-skipped' | 'file-written' | 'file-error' | 'template-resolved' | 'template-error';
  file?: string;
  reason?: string;
  error?: Error;
}

/**
 * Result of a scaffolding operation.
 */
export interface ScaffoldResult {
  written: string[];
  skipped: string[];
  events: ScaffoldEvent[];
}

// ===== Strategies =====

/**
 * Transform a raw name string into casing variants.
 */
export type CasingStrategy = (
  raw: string
) => Pick<ScaffoldContext, 'name' | 'Name' | 'name_snake' | 'NAME'>;

/**
 * Build or extend scaffold context with custom tokens.
 */
export type ContextProvider = (
  base: ScaffoldContext
) => Promise<ScaffoldContext> | ScaffoldContext;

/**
 * Decide whether a file should be emitted.
 */
export type FileFilter = (filePath: string) => boolean;

/**
 * Transform a file path before emission.
 */
export type PathTransformer = (path: string) => string;

/**
 * Map of all available strategies.
 */
export interface StrategyMap {
  casing: CasingStrategy;
  contextProvider: ContextProvider;
  fileFilter: FileFilter;
  pathTransformer: PathTransformer;
}

// ===== Utilities =====

export function getPluginTemplatesDir(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '../templates');
}
