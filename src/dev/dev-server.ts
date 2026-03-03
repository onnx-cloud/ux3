import * as http from 'http';
import * as path from 'path';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import YAML from 'yaml';
import { processAssets } from './asset-processor';
import { renderDashboard } from './dashboard';
import { HandlebarsLite } from '../hbs/index.js';

export interface DevServerOptions {
  verbose?: boolean;
  onError?: (error: Error) => void;
}

export interface ServerManifest {
  config: Record<string, any>;
  types: Record<string, any>;
  invokes: Record<string, any>;
  runtime?: {
    bundle: string;
    styles: string[];
    version: string;
    minified: boolean;
  };
  stats: {
    buildTime: number;
    configSize?: number;
    typesSize?: number;
    bundleSize?: number;
  };
}


async function getSiteConfig(projectDir: string, manifest: ServerManifest | null): Promise<any> {
  let ux3Config: any = {};
  try {
    const rootUx3 = path.join(projectDir, 'ux3.yaml');
    const legacyUx3 = path.join(projectDir, 'ux', 'ux3.yaml');
    const ux3Content = fsExtra.existsSync(rootUx3) ? await fsp.readFile(rootUx3, 'utf-8') : (fsExtra.existsSync(legacyUx3) ? await fsp.readFile(legacyUx3, 'utf-8') : '');
    if (ux3Content) ux3Config = YAML.parse(ux3Content);
  } catch {}

  const siteFromManifest = (manifest?.config as any)?.site || {};
  const siteFields = {
    title: path.basename(projectDir),
    ...siteFromManifest,
    ...(ux3Config.site || {})
  };
  // merge runtime info so processAssets can see it
  const mergedManifest: any = {
    ...(manifest || {}),
    config: { ...manifest?.config, site: siteFields },
  };
  return processAssets(mergedManifest, projectDir);
}

/**
 * Build a NavConfig for template rendering based on routes from manifest
 */
function buildNavConfig(
  pathname: string,
  routes: Array<{ path: string; view: string }>,
  i18n: Record<string, any> = {}
): Record<string, any> {
  // Find current route
  let currentPath = pathname;
  let currentView = 'home';
  
  for (const route of routes) {
    if (route.path === pathname) {
      currentPath = route.path;
      currentView = route.view;
      break;
    }
  }

  // Build nav routes with labels
  const navRoutes = routes.map(route => {
    let label: string | undefined;
    // Derive label from common i18n keys
    if (route.view === 'home') label = 'header.home';
    else if (route.view === 'market') label = 'header.market';
    else if (route.view === 'account') label = 'header.account';

    return {
      path: route.path,
      view: route.view,
      label,
    };
  });

  // Helper function to resolve i18n labels
  const getLabel = (route: any): string => {
    if (!route.label) return route.view;
    
    const parts = route.label.split('.');
    let value: any = i18n;
    for (const part of parts) {
      value = value?.[part];
    }

    if (typeof value === 'string') return value;
    return route.view;
  };

  return {
    routes: navRoutes,
    current: {
      path: currentPath,
      view: currentView,
      params: {},
    },
    canNavigate: (targetView?: string) => true, // In dev server, all views are navigable
    getLabel,
  };
}

async function getShellLayout(projectDir: string, view: any): Promise<{ chromeWrapperHtml: string, viewLayoutHtml: string }> {
  const viewLayoutName = (view && view.layout) ? String(view.layout) : '_';
  
  const candidateLayoutA = path.join(projectDir, 'ux', 'layout', `${viewLayoutName}.html`);
  const candidateLayoutB = path.join(projectDir, 'ux', 'layout', viewLayoutName, '_.html');
  const projectDefaultLayout = path.join(projectDir, 'ux', 'layout', '_.html');
  const frameworkDefaultPath = path.join(process.cwd(), 'src', 'ui', 'layouts', '_.html');
  const chromeWrapperPath = path.join(projectDir, 'ux', 'layout', 'chrome', 'wrapper.html');

  let projectLayoutPath = '';

  if (fsExtra.existsSync(candidateLayoutA)) projectLayoutPath = candidateLayoutA;
  else if (fsExtra.existsSync(candidateLayoutB)) projectLayoutPath = candidateLayoutB;
  else if (fsExtra.existsSync(projectDefaultLayout)) projectLayoutPath = projectDefaultLayout;

  let chromeWrapperHtml = '';
  let viewLayoutHtml = '';

  if (fsExtra.existsSync(chromeWrapperPath)) {
    chromeWrapperHtml = await fsp.readFile(chromeWrapperPath, 'utf-8');
    if (projectLayoutPath && fsExtra.existsSync(projectLayoutPath)) {
      viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
    }
  } else if (fsExtra.existsSync(projectDefaultLayout)) {
    chromeWrapperHtml = await fsp.readFile(projectDefaultLayout, 'utf-8');
    if (viewLayoutName !== '_' && projectLayoutPath && projectLayoutPath !== projectDefaultLayout && fsExtra.existsSync(projectLayoutPath)) {
      viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
    }
  } else if (fsExtra.existsSync(frameworkDefaultPath)) {
    chromeWrapperHtml = await fsp.readFile(frameworkDefaultPath, 'utf-8');
    if (projectLayoutPath && projectLayoutPath !== frameworkDefaultPath && fsExtra.existsSync(projectLayoutPath)) {
      viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
    }
  }
  
  return { chromeWrapperHtml, viewLayoutHtml };
}

async function resolveAndRenderLayout(
  projectDir: string,
  view: any,
  renderedTemplate: string,
  context: any,
  renderFn: (tpl: string, ctx: any) => string
): Promise<string> {
  const { chromeWrapperHtml, viewLayoutHtml } = await getShellLayout(projectDir, view);

  let tempHtml = renderedTemplate;
  if (viewLayoutHtml) {
    tempHtml = viewLayoutHtml.replace(/\{\{\{\s*content\s*\}\}\}/g, renderedTemplate)
                             .replace(/\{\{\s*>\s*layout\s*\}\}/g, renderedTemplate)
                             .replace(/\{\{\s*site\.template\s*\}\}/g, renderedTemplate);
  }

  let finalHtml = tempHtml;
  if (chromeWrapperHtml) {
    finalHtml = chromeWrapperHtml.replace(/\{\{\{\s*content\s*\}\}\}/g, tempHtml)
                                 .replace(/\{\{\s*>\s*layout\s*\}\}/g, tempHtml)
                                 .replace(/\{\{\s*site\.template\s*\}\}/g, tempHtml);
  }

  return renderFn(finalHtml, context);
}

export class DevServer {
  private server: http.Server | null = null;
  private manifest: ServerManifest | null = null;
  private clients: Set<http.ServerResponse> = new Set();
  private options: Required<DevServerOptions>;

  constructor(
    private projectDir: string,
    private port: number,
    private host: string,
    options: DevServerOptions = {}
  ) {
    this.options = {
      verbose: options.verbose ?? false,
      onError: options.onError ?? ((e) => console.error('Server error:', e)),
    };
  }

  async start(): Promise<void> {
    if (!this.manifest) {
      await this.build();
    }
    void this.findRepoRoot(this.projectDir);
    this.server = http.createServer(async (req, res) => {
      // avoid MaxListenersExceeded when many clients connect during dev
      try { this.server?.setMaxListeners(0); } catch {}
      try {
        if (!req.url || !req.headers.host) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request');
          return;
        }

        // Construct URL with host as base to support relative req.url values
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Hot reload and API endpoints (namespaced under /$/ to avoid app conflicts)
        // Dev namespace root (dashboard HTML)
        if (pathname === '/$' || pathname === '/$/') {
          const site = await getSiteConfig(this.projectDir, this.manifest);
          const html = await renderDashboard(this.projectDir, this.manifest, site);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
          return;
        }

        // API endpoints under /$/
        if (pathname.startsWith('/$/')) {
          if (pathname === '/$/hot-reload') {
            this.handleHotReload(res);
            return;
          }

          if (pathname === '/$/config') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.config ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/types') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.types ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/manifest') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.invokes ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/stats') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.stats ?? {}, null, 2));
            return;
          }

          // Unknown /$/ path
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }

        // Serve application front page
        // Priority: project ux3.yaml -> ux/view/index.yaml -> public/index.html -> fallback message
        if (pathname === '/') {
          const i18n = (this.manifest?.config as any)?.i18n || {};
          
          // First, try loading root ux3.yaml to get the most accurate site settings for front page
          

          const site = await getSiteConfig(this.projectDir, this.manifest);


          // First, try fallback: ux/view/index.yaml (if any)
          try {
            const defaultIndexPath = path.join(this.projectDir, 'ux', 'view', 'index.yaml');
            if (fsExtra.existsSync(defaultIndexPath)) {
              const viewYaml = await fsp.readFile(defaultIndexPath, 'utf-8');
              let view: any = {};
              try { view = YAML.parse(viewYaml); } catch {}

              // Resolve view template path (handle top-level and nested states for index fallback)
              let templateRel = '';
              if (view.template) {
                templateRel = view.template;
              } else if (view.states) {
                const stateName = view.initial || 'index';
                templateRel = (view.states[stateName] && view.states[stateName].template) || '';
              }
              let templateHtml = '';

              // Prefer compiled templates from in-memory manifest when available, otherwise read source file
              try {
                // Support both 'view/home/index.html' and 'home/index.html' formats
                let m = String(templateRel).match(/^view\/([^\/]+)(?:\/(.*))?$/);
                if (!m) {
                  // Try without the view/ prefix
                  m = String(templateRel).match(/^([^\/]+)(?:\/(.*))?$/);
                }
                const viewName = m ? m[1] : null;
                const stateName = m && m[2] ? m[2].replace(/\.html$/, '') : undefined;

                if (this.manifest && this.manifest.config && typeof this.manifest.config.templates === 'object') {
                  const tplMap = (this.manifest.config as any).templates || {};
                  // Prefer template map by the path-derived view name, but fall back to the current view's name (e.g., index) if not found
                  const viewTpl = viewName ? (tplMap[viewName] || {}) : {};
                  let candidate = (stateName && viewTpl[stateName]) || Object.values(viewTpl)[0];

                  if (!candidate) {
                    const currentViewName = (view && view.name) ? String(view.name) : 'index';
                    const currentTpl = tplMap[currentViewName] || {};
                    candidate = (stateName && currentTpl[stateName]) || Object.values(currentTpl)[0];
                    if (candidate) { /* resolved template from manifest for current view/state */ }
                  } else {
                    /* resolved template from manifest */
                  }

                  if (candidate) {
                    templateHtml = String(candidate);
                  }
       }

       // Fallback to filesystem when manifest doesn't provide template
                if (!templateHtml) {
                  let templatePath = path.join(this.projectDir, 'ux', templateRel.replace(/^\//, ''));
                  if (!fsExtra.existsSync(templatePath)) {
                    const alt = path.join(this.projectDir, templateRel.replace(/^\//, ''));
                    if (fsExtra.existsSync(alt)) templatePath = alt;
                  }

                  try { templateHtml = await fsp.readFile(templatePath, 'utf-8'); } catch (e) {
                    /* could not read template at path */
                  }
                }
              } catch (err) {
                /* manifest/template resolution failed */
              }

              // If still missing, instruct developer to compile (fail-fast, don't guess)
              if (!templateHtml) {
                templateHtml = `<div style="font-family:system-ui,Arial; padding:1rem"><h2>Missing view template</h2><p>The index view references <code>${templateRel}</code> but the template could not be found.</p><p>Run <code>npx ux3 compile</code> or <code>npm run build</code> to generate view artifacts, then refresh.</p></div>`;
              }
              // Build nav config
              const routes: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
              const nav = buildNavConfig(pathname, routes, i18n);
              
              // Final fallback to project-specific index view logic
              const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav });

              const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav }, renderTemplate);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(finalHtml);
              return;
            }
          } catch (e) {
            // ignore
          }

          try {
            // Look for ux3.yaml at project root or under ux/
            let ux3Path: string | null = null;
            const rootUx3 = path.join(this.projectDir, 'ux3.yaml');
            const legacyUx3 = path.join(this.projectDir, 'ux', 'ux3.yaml');
            if (fsExtra.existsSync(rootUx3)) ux3Path = rootUx3;
            else if (fsExtra.existsSync(legacyUx3)) ux3Path = legacyUx3;

            if (ux3Path) {
              const ux3Content = await fsp.readFile(ux3Path, 'utf-8');
              let uxConfig: any = {};
              try { uxConfig = YAML.parse(ux3Content); } catch { /* ignore */ }

              const i18n = (this.manifest?.config as any)?.i18n || {};
              const site = await getSiteConfig(this.projectDir, this.manifest);


              const indexSpec: string = uxConfig.index || 'view/index.yaml';
              const indexPath = path.join(this.projectDir, 'ux', indexSpec.replace(/^\//, ''));

              if (fsExtra.existsSync(indexPath)) {
                // Load view YAML
                const viewYaml = await fsp.readFile(indexPath, 'utf-8');
                let view: any = {};
                try { view = YAML.parse(viewYaml); } catch {}

                // Resolve view template path (handle top-level and nested states)
                let templateRel = '';
                if (view.template) {
                  templateRel = view.template;
                } else if (view.states) {
                  const stateName = view.initial || 'index';
                  templateRel = (view.states[stateName] && view.states[stateName].template) || '';
                }
                let templateHtml = '';

                // Prefer manifest template first (compiled output), otherwise read source file
                try {
                  const m = String(templateRel).match(/^view\/([^\/]+)(?:\/(.*))?$/);
                  let viewName: string | null = null;
                  let stateName: string | null = null;
                  if (m) {
                    viewName = m[1];
                    stateName = m[2] ? m[2].replace(/\.html$/,'') : (view.initial || 'index');
                  }

                  if (viewName && this.manifest && this.manifest.config && typeof this.manifest.config.templates === 'object') {
                    const tplMap = (this.manifest.config as any).templates || {};
                    const viewTpl = tplMap[viewName] || {};
                    const candidate = (viewTpl[stateName as string] || Object.values(viewTpl)[0]);
                    if (candidate) {
                      templateHtml = String(candidate);
                      /* resolved template from manifest */
                    }
                  }

                  if (!templateHtml) {
                    let templatePath = path.join(this.projectDir, 'ux', templateRel.replace(/^\//, ''));
                    if (!fsExtra.existsSync(templatePath)) {
                      const alt = path.join(this.projectDir, templateRel.replace(/^\//, ''));
                      if (fsExtra.existsSync(alt)) templatePath = alt;
                    }

                    // DEBUG: show paths and existence
                    /* index path debug removed */
                    try { templateHtml = await fsp.readFile(templatePath, 'utf-8'); } catch (e) { /* could not read template at path */ }
                  }
                } catch (err) {
                  /* manifest template lookup failed */
                }

                // If still missing, instruct developer to run compilation (fail-fast, don't guess)
                if (!templateHtml) {
                  const msg = `<div style="font-family:system-ui,Arial; padding:1rem"><h2>Missing view template</h2><p>The index view references <code>${templateRel}</code> but the template could not be found.</p><p>Run <code>npx ux3 compile</code> or <code>npm run build</code> to generate view artifacts, then refresh.</p></div>`;
                  templateHtml = msg;
                  // Note: do not throw or attempt additional fs guessing — stay within architecture contract
                  console.warn(`[DevServer] Missing template: ${templateRel}. compile generated views.`);
                }

                // Render the template into layout, resolving layoutName/title similar to other index path
                const routes: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
                const nav = buildNavConfig(pathname, routes, i18n);
                const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav });

                const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav }, renderTemplate);

                res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
                res.end(finalHtml);
                return;
              }
            }
          } catch (e) {
            // swallow and fallback
          }

          // Fallback to serving public/index.html
          const publicIndex = path.join(this.projectDir, 'public', 'index.html');
          if (fsExtra.existsSync(publicIndex)) {
            const indexContent = await fsp.readFile(publicIndex, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(indexContent);
            return;
          }

          // Final fallback: informational page pointing to dev dashboard
          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
          res.end(`<html><body><h1>No application index found</h1><p>Visit <a href="/$">Dev Dashboard</a></p></body></html>`);
          return;
        }

        // Serve static files from public directory
        let filePath = path.join(this.projectDir, 'public', pathname);
        try {
          const content = await fsp.readFile(filePath);
          const contentType = this.getContentType(filePath);
          res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
          res.end(content);
          return;
        } catch (e) {
          // File not found in public - fall through
        }

        // Also serve files from dist directory (bundles, styles)
        if (pathname.startsWith('/dist/')) {
          filePath = path.join(this.projectDir, pathname.replace(/^\//, ''));
          try {
            const content = await fsp.readFile(filePath);
            const contentType = this.getContentType(filePath);
            res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(content);
            return;
          } catch (e) {
            // not found in dist either
          }
        }

        // Try to resolve as a configured route -> view
        try {
          const routes: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
          const match = routes.find(r => this.pathMatches(r.path, pathname));
          if (match) {
            const viewName = match.view;
            const viewYamlPath = path.join(this.projectDir, 'ux', 'view', `${viewName}.yaml`);
            if (fsExtra.existsSync(viewYamlPath)) {
              const viewYaml = await fsp.readFile(viewYamlPath, 'utf-8');
              let view: any = {};
              try { view = YAML.parse(viewYaml); } catch {}

              const i18n = (this.manifest?.config as any)?.i18n || {};
              const site = await getSiteConfig(this.projectDir, this.manifest);

              // Resolve template path from top-level field OR from the initial/first state
              let templateRel = '';
              if (view.template) {
                templateRel = view.template;
              } else if (view.states) {
                const stateName = view.initial || Object.keys(view.states)[0];
                const stateConfig = view.states?.[stateName];
                templateRel = (typeof stateConfig === 'string' ? stateConfig : stateConfig?.template) || '';
              }
              let templateHtml = '';

              // Try compiled manifest template for this view first
              try {
                if (this.manifest && this.manifest.config && typeof this.manifest.config.templates === 'object') {
                  const tplMap = (this.manifest.config as any).templates || {};
                  const viewTpl = tplMap[viewName] || {};
                  // Use specific state template or first available
                  const stateName = (view.initial || Object.keys(view.states || {})[0] || 'index');
                  const candidate = viewTpl[stateName] || Object.values(viewTpl)[0];
                  if (candidate) {
                    templateHtml = String(candidate);
                  }
                }

                if (!templateHtml && templateRel) {
                  // Try multiple resolution paths for bare filenames
                  const tplCandidates = [
                    path.join(this.projectDir, 'ux', templateRel.replace(/^\//,'')),
                    path.join(this.projectDir, 'ux', 'view', templateRel.replace(/^\//,'')),
                    path.join(this.projectDir, 'ux', 'view', viewName, templateRel.replace(/^\//,'')),
                  ];
                  for (const tp of tplCandidates) {
                    if (fsExtra.existsSync(tp)) {
                      templateHtml = await fsp.readFile(tp, 'utf-8');
                      break;
                    }
                  }
                }
              } catch (e) {}

              // For content views, look up the matching content item and expose it as `this`
              const contentManifest: any = (this.manifest?.config as any)?.content;
              const contentItem = contentManifest?.items?.find(
                (item: any) => item.frontmatter.path === pathname || `/${item.slug}` === pathname
              ) ?? null;

              const routeList: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
              const nav = buildNavConfig(pathname, routeList, i18n);
              const templateCtx: Record<string, any> = {
                manifest: this.manifest ?? {},
                projectName: path.basename(this.projectDir),
                i18n,
                site,
                nav,
                ...(contentItem ? { this: contentItem } : {}),
              };
              const renderedTemplate = renderTemplate(templateHtml, templateCtx);

              const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, templateCtx, renderTemplate);

              res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
              res.end(finalHtml);
              return;
            }
          }
        } catch (e) {
          // ignore and continue to 404
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      } catch (error) {
        // If we've already sent headers, do not attempt to write again.
        if (res.headersSent) {
          this.options.onError(error instanceof Error ? error : new Error(String(error)));
          return;
        }

        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        this.options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Prevent EventEmitter MaxListeners warnings when many clients connect
    if (this.server) {
      try { this.server.setMaxListeners(0); } catch {}
    }

    return new Promise((resolve) => {
      this.server!.listen(this.port, this.host, () => {
        console.log(`🌐 Dev server running on http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      for (const client of Array.from(this.clients)) {
        client.end();
      }
      this.clients.clear();

      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  setManifest(manifest: ServerManifest): void {
    this.manifest = manifest;
  }

  /**
   * Auto-build the manifest from the project directory using ConfigGenerator.
   * Called by start() when no manifest has been set, so the server can serve
   * routes (including content routes) without a prior compile step.
   */
  async build(): Promise<void> {
    try {
      const { ConfigGenerator } = await import('../build/config-generator.js');
      const outDir = path.join(this.projectDir, 'generated');
      const gen = new ConfigGenerator({ configDir: this.projectDir, outputDir: outDir });
      const cfg = await gen.generate();
      this.manifest = {
        config: cfg as any,
        types: {},
        invokes: {},
        stats: { buildTime: Date.now() },
      };
    } catch (e) {
      if (this.options.verbose) {
        console.warn('[DevServer] auto-build failed:', e);
      }
    }
  }

  broadcast(message: Record<string, any>): void {
    for (const client of Array.from(this.clients)) {
      try {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    }
  }

  private handleHotReload(res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * Generate a simple dev index based on current manifest to avoid writing files next to source.
   */
  /* removed unused generateIndexFromManifest */

  private pathMatches(routePath: string, requestPath: string): boolean {
    const norm = (p: string) => (p || '').replace(/\/+$/, '') || '/';
    return norm(routePath) === norm(requestPath);
  }

  /** Find repo root by looking for package.json */
  private findRepoRoot(start: string): string | null {
    let current = start;
    for (let i = 0; i < 10; i++) {
      const candidate = path.join(current, 'package.json');
      if (fsExtra.existsSync(candidate)) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return null;
  }
}

/**
 * Template rendering using HBS (Handlebars-Lite) engine
 * Supports {{#if}}, {{#each}}, {{#unless}}, {{key}}, {{{html}}} and helpers
 */
const hbsEngine = new HandlebarsLite({
  helpers: {
    eq: (a: any, b: any) => a === b,
    ne: (a: any, b: any) => a !== b,
  },
});

function renderTemplate(template: string, context: Record<string, any> = {}): string {
  if (!template) return '';
  return hbsEngine.render(template, context);
}

