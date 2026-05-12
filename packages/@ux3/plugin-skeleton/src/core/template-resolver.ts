import * as fsSync from 'fs';
import * as path from 'path';
import { getPluginTemplatesDir } from '../types.js';

/**
 * Resolve the directory for a given section's templates.
 * Resolution order:
 * 1. User override: <projectRoot>/.ux3/templates/<section>/
 * 2. User app override: <projectRoot>/.ux3/templates/app/<section>/
 * 3. Plugin direct: <plugin>/templates/<section>/
 * 4. Plugin app: <plugin>/templates/app/<section>/
 */
export function resolveTemplateDir(section: string, projectRoot?: string): string {
  // Check user overrides first
  if (projectRoot) {
    const override = path.join(projectRoot, '.ux3', 'templates', section);
    if (fsSync.existsSync(override)) return override;

    const appOverride = path.join(projectRoot, '.ux3', 'templates', 'app', section);
    if (fsSync.existsSync(appOverride)) return appOverride;
  }

  // Fall back to plugin templates
  const pluginTemplatesDir = getPluginTemplatesDir();
  const direct = path.join(pluginTemplatesDir, section);
  if (fsSync.existsSync(direct)) return direct;

  const appTemplateDir = path.join(pluginTemplatesDir, 'app', section);
  if (fsSync.existsSync(appTemplateDir)) return appTemplateDir;

  throw new Error(
    `No template directory found for section "${section}". ` +
    `Checked: ${projectRoot ? `${path.join(projectRoot, '.ux3/templates', section)}, ` : ''}` +
    `${direct}, ${appTemplateDir}`
  );
}

/**
 * Get the search paths that would be checked for a section.
 * Useful for error messages and debugging.
 */
export function getTemplateDirSearchPaths(section: string, projectRoot?: string): string[] {
  const paths: string[] = [];
  if (projectRoot) {
    paths.push(path.join(projectRoot, '.ux3', 'templates', section));
    paths.push(path.join(projectRoot, '.ux3', 'templates', 'app', section));
  }
  const pluginDir = getPluginTemplatesDir();
  paths.push(path.join(pluginDir, section));
  paths.push(path.join(pluginDir, 'app', section));
  return paths;
}
