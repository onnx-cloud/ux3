import * as path from 'path';
import * as fs from 'fs';
import YAML from 'yaml';
import { HandlebarsLite } from '../hbs/index.js';

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

  // runtime injection (bundle + styles + hydration) based on manifest/runtime
  const runtime = (manifest as any)?.runtime;
  const runtimeConfig = (manifest as any)?.config?.site?.runtime || {};
  if (runtime && runtimeConfig?.bundleKey) {
    // inject styles first
    for (const style of runtime.styles || []) {
      headInjections.push(`<link rel="stylesheet" href="${style}" data-ux3="styles">`);
    }

    // hydration inline script - dynamically import the bundle as a module and
    // then invoke the exported hydration function.  Bundle URL is normalized
    // to an absolute path to avoid relative resolution issues, and we append
    // a timestamp query string to bust any browser cache.
    let bundleUrl = runtime.bundle;
    if (bundleUrl && !bundleUrl.startsWith('/')) {
      bundleUrl = '/' + bundleUrl;
    }
    // add cache-busting parameter
    const bundleUrlWithTs = bundleUrl + `?ts=${Date.now()}`;
    const hydrationFn = runtimeConfig.hydrationFn || 'initApp';
    scriptInjections.push(
      `<script data-ux3="hydration">` +
      `document.addEventListener('DOMContentLoaded', async () => { ` +
      `  try { ` +
      `    const m = await import('${bundleUrlWithTs}'); ` +
      `    if (m && typeof m.${hydrationFn} === 'function') { ` +
      `      await m.${hydrationFn}(); ` +
      `    } ` +
      `  } catch(e) { console.error('[UX3 hydration]', e); } ` +
      `});` +
      `</script>`
    );  }

  return {
    ...rawSite,
    head: headInjections.join('\n    '),
    scripts: scriptInjections.join('\n    ')
  };
}

/**
 * A lightweight template renderer for dev-server 'chrome' using HBS.
 * Handles base layout injection with i18n and site variables.
 */
const hbsEngine = new HandlebarsLite();

export function renderTpl(tpl: string, ctx: { site: any; i18n?: any; [key: string]: any }) {
  return hbsEngine.render(tpl, ctx);
}
