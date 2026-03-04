/**
 * Config Loader - Merges YAML/JSON/JS configs with deep merge
 * Supports: configs/*.yaml, configs/*.json, ux3.config.js
 * 
 * Mandatory keys: routes, services, tokens
 * Merge strategy: all configs merged deeply, last-one-wins
 * Load order: all YAML/JSON in alphabetical order, then JS last
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
void __dirname; // referenced to satisfy linter/TS when not used directly

/**
 * Required top-level config keys that must be present
 */
const MANDATORY_KEYS = ['routes', 'services', 'tokens'];

/**
 * App config types - improved coverage (avoid `any`)
 */
export interface RouteItem {
  path: string;
  view?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ServiceConfig {
  type?: string;
  baseUrl?: string;
  auth?: { token?: string } | null;
  [key: string]: unknown;
}

export interface TokensConfig {
  colors?: Record<string, string>;
  spacing?: Record<string, string>;
  typography?: Record<string, string>;
  [key: string]: unknown;
}

export type StylesConfig = Record<string, unknown>;
export type I18nLocale = Record<string, string | Record<string, any>>;
export type I18nConfig = Record<string, I18nLocale>;

export interface ViewConfig {
  name?: string;
  layout?: string;
  initial?: string;
  states?: Record<string, any>;
  [key: string]: unknown;
}

export interface AppConfig {
  routes?: RouteItem[];
  services?: Record<string, ServiceConfig> | ServiceConfig[];
  tokens?: TokensConfig;
  style?: StylesConfig;
  i18n?: I18nConfig;
  view?: Record<string, ViewConfig>;
  validate?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Load YAML file (with lazy loading of yaml package)
 */
async function loadYaml(filePath: string): Promise<Partial<AppConfig>> {
  const { parse } = await import('yaml');
  const content = await fs.readFile(filePath, 'utf-8');
  return parse(content) as Partial<AppConfig>;
}

/**
 * Load JSON file
 */
async function loadJson(filePath: string): Promise<Partial<AppConfig>> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as Partial<AppConfig>;
}

/**
 * Load JavaScript/TypeScript config file
 */
async function loadJsConfig(filePath: string): Promise<Partial<AppConfig>> {
  try {
    // Use dynamic import for ESM modules
    const module = await import(filePath) as { default?: unknown };
    return ((module.default || module) as Partial<AppConfig>) || {};
  } catch (error) {
    console.error(`Failed to load JS config: ${filePath}`, error);
    throw error;
  }
}

/**
 * Deep merge objects - last value wins
 */
export function deepMerge<T extends Record<string, any>>(
  ...objects: (T | undefined)[]
): T {
  return objects.reduce<T>((result, obj) => {
    if (!obj) return result;

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const srcValue = obj[key];
        const resultValue = result[key];

        if (
          srcValue &&
          typeof srcValue === 'object' &&
          !Array.isArray(srcValue) &&
          resultValue &&
          typeof resultValue === 'object' &&
          !Array.isArray(resultValue)
        ) {
          // Deep merge objects
          result[key] = deepMerge(resultValue, srcValue);
        } else {
          // Last value wins (including arrays, primitives, null)
          result[key] = srcValue;
        }
      }
    }

    return result;
  }, {} as T);
}

/**
 * Find all config files in configs/ directory
 */
async function findConfigFiles(
  projectRoot: string
): Promise<{
  yaml: string[];
  json: string[];
  js: string | null;
}> {
  const configDir = path.join(projectRoot, 'configs');
  const result = { yaml: [] as string[], json: [] as string[], js: null as string | null };

  try {
    const files = await fs.readdir(configDir);
    files.sort(); // Alphabetical order

    for (const file of files) {
      const fullPath = path.join(configDir, file);
      const stat = await fs.stat(fullPath);

      if (stat.isFile()) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          result.yaml.push(fullPath);
        } else if (file.endsWith('.json')) {
          result.json.push(fullPath);
        }
      }
    }
  } catch (error) {
    // configs/ directory may not exist, which is fine
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Check for ux3.config.js or ux3.config.ts in project root
  const jsConfigPath = path.join(projectRoot, 'ux3.config.js');
  const tsConfigPath = path.join(projectRoot, 'ux3.config.ts');
  try {
    await fs.stat(jsConfigPath);
    result.js = jsConfigPath;
  } catch {
    // JS not found, try TS
    try {
      await fs.stat(tsConfigPath);
      result.js = tsConfigPath;
    } catch {
      // Not found, which is fine
    }
  }

  return result;
}

/**
 * Validate mandatory keys exist in config
 */
function validateMandatoryKeys(config: any): void {
  const missingKeys = MANDATORY_KEYS.filter((key) => !(key in config));

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing mandatory config keys: ${missingKeys.join(', ')}. ` +
        `These must be defined in configs/*.yaml, configs/*.json, or ux3.config.js`
    );
  }
}

/**
 * Load and merge all config files
 * 
 * @param projectRoot - Project root directory
 * @param options - Loading options
 * @returns Merged configuration object
 * 
 * @throws Error if mandatory keys (routes, services, tokens) are missing
 * @throws Error if config files cannot be parsed
 */
export async function loadConfig(
  projectRoot: string = process.cwd(),
  options: {
    validateMandatory?: boolean;
    logLoading?: boolean;
  } = {}
): Promise<AppConfig> {
  const { validateMandatory = true, logLoading = false } = options;

  if (logLoading) {
    console.log(`📦 Loading config from ${projectRoot}...`);
  }

  const configFiles = await findConfigFiles(projectRoot);
  const configs: any[] = [];
  const loadedPaths: string[] = [];

  try {
    // Load YAML configs in alphabetical order
    for (const yamlPath of configFiles.yaml) {
      if (logLoading) {
        console.log(`  📄 Loading: ${path.relative(projectRoot, yamlPath)}`);
      }
      const data = await loadYaml(yamlPath);
      configs.push(data);
      loadedPaths.push(yamlPath);
    }

    // Load JSON configs in alphabetical order
    for (const jsonPath of configFiles.json) {
      if (logLoading) {
        console.log(`  📄 Loading: ${path.relative(projectRoot, jsonPath)}`);
      }
      const data = await loadJson(jsonPath);
      configs.push(data);
      loadedPaths.push(jsonPath);
    }

    // Load JavaScript config last (so it has priority)
    if (configFiles.js) {
      if (logLoading) {
        console.log(`  📄 Loading: ${path.relative(projectRoot, configFiles.js)}`);
      }
      const data = await loadJsConfig(configFiles.js);
      configs.push(data);
      loadedPaths.push(configFiles.js);
    }

    // Merge all configs deeply
    const mergedConfig = deepMerge(...(configs as Record<string, unknown>[])) as AppConfig;

    // Validate mandatory keys
    if (validateMandatory) {
      validateMandatoryKeys(mergedConfig);
    }

    if (logLoading) {
      console.log(`✅ Config loaded successfully (${loadedPaths.length} files merged)\n`);
    }

    return mergedConfig;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config: ${errorMessage}`);
  }
}

/**
 * Load config with caching
 */
const configCache = new Map<string, AppConfig>();

export async function loadConfigCached(
  projectRoot: string = process.cwd(),
  options: {
    validateMandatory?: boolean;
    logLoading?: boolean;
    cache?: boolean;
  } = {}
): Promise<AppConfig> {
  const { cache = true, ...loadOptions } = options;
  const cacheKey = path.resolve(projectRoot);

  if (cache && configCache.has(cacheKey)) {
    return configCache.get(cacheKey)!;
  }

  const config = await loadConfig(projectRoot, loadOptions);

  if (cache) {
    configCache.set(cacheKey, config);
  }

  return config;
}

/**
 * Clear config cache
 */
export function clearConfigCache(projectRoot?: string): void {
  if (projectRoot) {
    configCache.delete(path.resolve(projectRoot));
  } else {
    configCache.clear();
  }
}

/**
 * Get a specific config value by dot notation path
 * 
 * @example
 * getConfigValue(config, 'routes.0.path') // => '/'
 * getConfigValue(config, 'tokens.colors.primary', '#fff') // => with default
 */
export function getConfigValue(
  config: AppConfig,
  path: string,
  defaultValue?: unknown
): unknown {
  const keys = path.split('.');
  let current: unknown = config;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }

    // Handle array indices
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        current = (current as Record<string, unknown>)[key];
      }
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }

  return current ?? defaultValue;
}

/**
 * Set a config value by dot notation path
 * Creates nested objects as needed
 */
export function setConfigValue(config: AppConfig, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: Record<string, unknown> = config;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[lastKey] = value;
}
