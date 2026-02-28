import * as path from 'path';
import * as fs from 'fs';
import YAML from 'yaml';

/**
 * Standardizes asset extraction (scripts/styles) from manifest or project config.
 * Supports the declarative 'site.assets' pattern and legacy 'site.cdn'.
 */
export function processAssets(manifest: any, projectDir: string) {
  let siteAssets = (manifest?.config as any)?.site?.assets || [];
  const rawSite = (manifest?.config as any)?.site || { title: path.basename(projectDir) };

  // Fallback: If manifest has NO assets but we're in a project, check ux3.yaml directly
  if (!siteAssets || siteAssets.length === 0) {
    try {
      const ux3Path = path.join(projectDir, 'ux3.yaml');
      if (fs.existsSync(ux3Path)) {
        const yaml = YAML.parse(fs.readFileSync(ux3Path, 'utf-8'));
        siteAssets = yaml.site?.assets || [];
      }
    } catch {}
  }

  const headInjections: string[] = [];
  const scriptInjections: string[] = [];

  for (const asset of siteAssets) {
    if (asset.type === 'style') {
      headInjections.push(`<link rel="stylesheet" href="${asset.href}">`);
    } else if (asset.type === 'script') {
      const attrs = [];
      if (asset.async) attrs.push('async');
      if (asset.defer) attrs.push('defer');
      const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
      scriptInjections.push(`<script src="${asset.src}"${attrStr}></script>`);
    }
  }

  // Also support legacy 'site.cdn' list if present for backward compatibility
  if (rawSite.cdn && Array.isArray(rawSite.cdn)) {
    for (const url of rawSite.cdn) {
      scriptInjections.push(`<script src="${url}"></script>`);
    }
  }

  return {
    ...rawSite,
    head: headInjections.join('\n    '),
    scripts: scriptInjections.join('\n    ')
  };
}

/**
 * A lightweight template renderer for dev-server 'chrome'.
 * Not intended to replace the full compiler, but to handle base layout injection.
 */
export function renderTpl(tpl: string, ctx: { site: any; i18n?: any; [key: string]: any }) {
  let out = tpl;

  // Replace i18n placeholders: {{i18n.key.path}}
  out = out.replace(/\{\{\s*i18n\.([\w\.]+)\s*\}\}/g, (_, key) => {
    const parts = key.split('.');
    let val = parts.reduce((o: any, i: string) => o?.[i], ctx.i18n);
    // Try English fallback
    if (val === undefined && ctx.i18n?.en) {
      val = parts.reduce((o: any, i: string) => o?.[i], ctx.i18n.en);
    }
    return val !== undefined ? val : `[${key}]`;
  });

  // Replace site placeholders with HTML support: {{{site.head}}} etc.
  out = out.replace(/\{\{\{\s*site\.([\w\.]+)\s*\}\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o: any, i: string) => o?.[i], ctx.site);
    return val !== undefined ? val : '';
  });

  // Replace simple site placeholders: {{site.title}}
  out = out.replace(/\{\{\s*site\.([\w\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o: any, i: string) => o?.[i], ctx.site);
    return val !== undefined ? val : `[site.${key}]`;
  });

  return out;
}
